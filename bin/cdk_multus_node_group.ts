#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkMultusNodeGroupStack } from '../lib/cdk_multus_node_group-stack';

const app = new cdk.App();
new CdkMultusNodeGroupStack(app, 'CdkMultusNodeGroupStack', {
    env: {
        account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION
    }
});
