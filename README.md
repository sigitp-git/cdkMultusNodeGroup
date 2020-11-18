# CDK for Multus CNI ready EKS managed NodeGroup 
This is a temporary private Git repo for CDK sample of "Multus CNI for EKS managed Nodegroup".

## HOWTO
After Git clone, please do..

* `npm install` //for Packages installation
* Setting environmental variables according to your environment.
    * package.json → list all the packages required such as @aws-cdk/aws-ec2 (You don't have to change unless you do change code to use other packages).
    * cdk.json → configure variables such as vpc-id, eks cluster name, multus subnetId, security group Id and so on.
    * To use existing VPC, below env should be added to bin/cdk.ts
* `cdk synth` //emits the synthesized CloudFormation template
* `cdk deploy` //deploy this stack to your default AWS account/region

## cdkMultusNodeGroup
* CDK creates 2 Lambda (1> attach multus eni, 2> auto reboot) to attach multus ENIs to EKS managed NodeGroup.
* Basically, logic is identical to the one, CloudFormation version. https://github.com/aws-samples/cfn-nodegroup-for-multus-cni
* CFN version is only available with Self-Managed NodeGroup (because of constraints of CFN, lack of interactability - In CFN, it is not possible to find AutoScaling Group armed to EKS NodeGroup while we need this for CloudWatch Event Rule configuration).
* CDK version makes this to be available using AwsCustomResource SDK API call.
