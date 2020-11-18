import boto3, json
from botocore.vendored import requests
import json

SUCCESS = "SUCCESS"
FAILED = "FAILED"

asg_client = boto3.client('autoscaling')
ec2_client = boto3.client('ec2')

def handler (event, context):
    AutoScalingGroupName = event['ResourceProperties']['AsgName']
    asg_response = asg_client.describe_auto_scaling_groups(AutoScalingGroupNames=[AutoScalingGroupName])
    instance_ids = []

    for i in asg_response['AutoScalingGroups']:
        for k in i['Instances']:
            instance_ids.append(k['InstanceId'])

    if instance_ids != []:
        ec2_client.terminate_instances(InstanceIds = instance_ids)

    responseValue = 1
    responseData = {}
    responseData['Data'] = responseValue
    send(event, context, SUCCESS, responseData, "CustomResourcePhysicalID")

def send(event, context, responseStatus, responseData, physicalResourceId=None, noEcho=False):
    responseUrl = event['ResponseURL']
    responseBody = {}
    responseBody['Status'] = responseStatus
    responseBody['Reason'] = 'See the details in CloudWatch Log Stream: ' + context.log_stream_name
    responseBody['PhysicalResourceId'] = physicalResourceId or context.log_stream_name
    responseBody['StackId'] = event['StackId']
    responseBody['RequestId'] = event['RequestId']
    responseBody['LogicalResourceId'] = event['LogicalResourceId']
    responseBody['NoEcho'] = noEcho
    responseBody['Data'] = responseData
    json_responseBody = json.dumps(responseBody)

    headers = {
        'content-type' : '',
        'content-length' : str(len(json_responseBody))
    }

    response = requests.put(responseUrl, data=json_responseBody, headers=headers)
    #print("Status code: " + response.reason)
