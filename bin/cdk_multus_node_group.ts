#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkMultusNodeGroupStack } from '../lib/cdk_multus_node_group-stack';

const app = new cdk.App();
new CdkMultusNodeGroupStack(app, 'CdkMultusNodeGroupStack');
