import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as targets from '@aws-cdk/aws-events-targets';
import * as events from '@aws-cdk/aws-events';
import * as custom from '@aws-cdk/custom-resources';
import * as cdk from '@aws-cdk/core';
import console = require('console');

export class CdkMultusNodeGroupStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Use existing VPC
    const vpcEks = ec2.Vpc.fromLookup(this,"eks-vpc-stack-VPC",{
        vpcId: this.node.tryGetContext("eks.vpcid")
    });

    // Use existing EKS Cluster
    const eksCluster = eks.Cluster.fromClusterAttributes(this, "eks-cluster", {
        clusterName: this.node.tryGetContext("eks.clustername"),
        vpc: vpcEks,
    });

    // Create EKS managed nodegroup
    const k8sSubnet = ec2.Subnet.fromSubnetId(this, "k8s-subnet",
                              this.node.tryGetContext("eks.k8ssubnetid"));
    const ng = new eks.Nodegroup(this, "node-group", {
        cluster: eksCluster,
        instanceType: new ec2.InstanceType("c5.large"),
        minSize: this.node.tryGetContext("nodegroup.min"),
        desiredSize: this.node.tryGetContext("nodegroup.desired"),
        maxSize: this.node.tryGetContext("nodegroup.max"),
        subnets: {
            onePerAz: true,
            subnets: [k8sSubnet]}
    });

    // Create Lambda for attaching 2nd ENI
    const attachEniPolicyStatement = new iam.PolicyStatement();
    attachEniPolicyStatement.addActions("ec2:CreateNetworkInterface",
                                        "ec2:DescribeInstances",
                                        "ec2:ModifyNetworkInterfaceAttribute",
                                        "autoscaling:CompleteLifecycleAction",
                                        "ec2:DeleteTags",
                                        "ec2:DescribeNetworkInterfaces",
                                        "ec2:CreateTags",
                                        "ec2:DeleteNetworkInterface",
                                        "ec2:AttachNetworkInterface",
                                        "autoscaling:DescribeAutoScalingGroups",
                                        "ec2:TerminateInstances",
                                        "ec2:DetachNetworkInterface");
    attachEniPolicyStatement.addResources("*");
    attachEniPolicyStatement.addActions("logs:CreateLogStream",
                                        "logs:PutLogEvents",
                                        "logs:CreateLogGroup");
    attachEniPolicyStatement.addResources("arn:aws:logs:*:*:*");

    const lambdaAttachMultusEni = new lambda.Function(this, "LambdaAttachMultusEni", {
        runtime: lambda.Runtime.PYTHON_3_6,
        code: lambda.Code.fromAsset('lambda'),
        handler: 'attach_multus_eni.lambda_handler',
        environment: {
            SubnetId1: this.node.tryGetContext("eks.multussubnet1"),
            SecGroupId1: this.node.tryGetContext("eks.multussecgroup1")
        }
    });
    lambdaAttachMultusEni.addToRolePolicy(attachEniPolicyStatement);

    // Find the asgName for CWE
    const customApiCallPolicyStatement = new iam.PolicyStatement();
    customApiCallPolicyStatement.addActions("eks:describeNodegroup");
    customApiCallPolicyStatement.addResources("*")

    const nodegroupNameStrings = cdk.Fn.split("/", ng.nodegroupName);
    const ngName = cdk.Fn.select(1, nodegroupNameStrings);
    const customApiCall = new custom.AwsCustomResource(this, "FindAutoScalingGroup", {
         policy: {
             statements: [customApiCallPolicyStatement],
             resources: ["*"]},
         onCreate: {
             service: "EKS",
             action: "describeNodegroup",
             parameters: {
                 clusterName: eksCluster.clusterName,
                 nodegroupName: ngName},
             physicalResourceId: {
                 id: "customResourceForApiCall"}
         }
    });
    const asgName = customApiCall.getResponseField('nodegroup.resources.autoScalingGroups.0.name');

    // Create Cloudwatch Event
    const eventRule = new events.Rule(this, "cw-event-rule",{
        eventPattern: {
            source: ["aws.autoscaling"],
            detailType: ["EC2 Instance-launch Lifecycle Action", "EC2 Instance-terminate Lifecycle Action"],
            detail: {
                AutoScalingGroupName: [asgName],
            }
        }
    });
    eventRule.addTarget(new targets.LambdaFunction(lambdaAttachMultusEni));

    //Create Lambda backed custom resource for auto-reboot
    const autoRebootPolicyStatement = new iam.PolicyStatement();
    autoRebootPolicyStatement.addActions("autoscaling:DescribeAutoScalingGroups",
                                        "ec2:TerminateInstances");
    autoRebootPolicyStatement.addResources("*")
    const lambdaAutoReboot = new lambda.Function(this, "LambdaAutoReboot", {
        runtime: lambda.Runtime.PYTHON_3_6,
        code: lambda.Code.fromAsset('lambda'),
        handler: 'auto_reboot.handler',
    });
    lambdaAutoReboot.addToRolePolicy(autoRebootPolicyStatement);

    const customLambdaAutoReboot = new cdk.CustomResource(this, "LambdaAutoReoobt", {
        serviceToken: lambdaAutoReboot.functionArn,
        properties: {
            AsgName: asgName,
        }
    });
  }
}
