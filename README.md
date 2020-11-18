# CDK for Multus CNI ready EKS managed NodeGroup 
This is a temporary private Git repo for CDK sample of "Multus CNI for EKS managed Nodegroup".

## Prerequisites
* You have to install nodejs and CDK. <br>
`sudo yum install nodejs`  <br>
`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash` <br>
`. ~/.nvm/nvm.sh` <br>
`nvm install 10.23.0` <br>
`sudo npm install -g npm@latest` (to install 6.14.8) <br>
`sudo npm install -g aws-cdk` <br>

## HOWTO
After `git clone https://github.com/crosscom/cdkMultusNodeGroup.git`, please do..

* `npm install` //for Packages installation
* Setting environmental variables according to your environment.
    * package.json → list all the packages required such as @aws-cdk/aws-ec2 (You don't have to change unless you do change code to use other packages).
    * cdk.json → configure variables such as vpc-id, eks cluster name, multus subnetId, security group Id and so on.
    * To use existing VPC, below env should be in bin/cdk.ts (It's already there, you don't have to change). <br>
    ``
    env: { 
        account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION
    }
    ``
* `cdk synth` //emits the synthesized CloudFormation template
* `cdk deploy` //deploy this stack to your default AWS account/region

## cdkMultusNodeGroup
* CDK creates 2 Lambda (1> attach multus eni, 2> auto reboot) to attach multus ENIs to EKS managed NodeGroup.
* Basically, logic is identical to the one, CloudFormation version. https://github.com/aws-samples/cfn-nodegroup-for-multus-cni
* CFN version is only available with Self-Managed NodeGroup (because of constraints of CFN, lack of interactability - In CFN, it is not possible to find AutoScaling Group armed to EKS NodeGroup while we need this for CloudWatch Event Rule configuration).
* CDK version makes this to be available using AwsCustomResource SDK API call.
