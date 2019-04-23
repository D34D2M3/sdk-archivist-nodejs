/*
 * File: main-table.ts
 * Project: @xyo-network/sdk-archivist-nodejs
 * File Created: Tuesday, 23rd April 2019 8:14:51 am
 * Author: XYO Development Team (support@xyo.network)
 * -----
 * Last Modified: Tuesday, 23rd April 2019 10:11:20 am
 * Modified By: XYO Development Team (support@xyo.network>)
 * -----
 * Copyright 2017 - 2019 XY - The Persistent Company
 */

import { Table } from './table'
import { DynamoDB } from 'aws-sdk'
import chalk from 'chalk'

export class BoundWitnessTable extends Table {

  constructor(
    tableName: string = 'xyo-archivist-boundwitness',
    region: string = 'us-east-1'
  ) {
    super(tableName, region)
    this.createTableInput = {
      AttributeDefinitions: [
        {
          AttributeName: 'Hash',
          AttributeType: 'B'
        }
      ],
      KeySchema: [
        {
          AttributeName: 'Hash',
          KeyType: 'HASH'
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      },
      TableName: tableName
    }
  }

  public async getItem(hash: Buffer): Promise<any> {
    return new Promise<boolean>((resolve: any, reject: any) => {
      try {
        const params: DynamoDB.Types.GetItemInput = {
          Key: {
            Hash: {
              B: this.sha1(hash)
            }
          },
          ReturnConsumedCapacity: 'TOTAL',
          TableName: this.tableName
        }
        this.dynamodb.getItem(params, (err: any, data: DynamoDB.Types.GetItemOutput) => {
          if (err) {
            reject(err)
          }
          resolve(data.Item)
        })
      } catch (ex) {
        console.log(chalk.red(ex))
        reject(ex)
      }
    })
  }

  public async putItem(
    hash: Buffer,
    originBlock: Buffer
  ): Promise<void> {
    return new Promise<void>((resolve: any, reject: any) => {
      try {
        const params: DynamoDB.Types.PutItemInput = {
          Item: {
            Hash: {
              B: this.sha1(hash)
            },
            Data: {
              B: originBlock
            }
          },
          ReturnConsumedCapacity: 'TOTAL',
          TableName: this.tableName
        }
        this.dynamodb.putItem(params, (err: any, data: DynamoDB.Types.PutItemOutput) => {
          if (err) {
            reject(err)
          }
          resolve()
        })
      } catch (ex) {
        console.log(chalk.red(ex))
        reject(ex)
      }
    })
  }

  public async deleteItem(hash: Buffer): Promise<void> {
    return new Promise<void>((resolve: any, reject: any) => {
      const params: DynamoDB.Types.DeleteItemInput = {
        Key: {
          Hash: {
            B: this.sha1(hash)
          }
        },
        ReturnConsumedCapacity: 'TOTAL',
        TableName: this.tableName
      }
      this.dynamodb.deleteItem(params, (err: any, data: DynamoDB.Types.DeleteItemOutput) => {
        if (err) {
          reject(err)
        }
        resolve()
      })
    })
  }

  public async scan(limit: number, offsetHash ?: Buffer | undefined): Promise <any[]> {
    return new Promise<[]>((resolve: any, reject: any) => {
      const params: DynamoDB.Types.ScanInput = {
        Limit: limit,
        ReturnConsumedCapacity: 'TOTAL',
        TableName: this.tableName
      }
      if (offsetHash) {
        params.ExclusiveStartKey = {
          Hash: {
            B: this.sha1(offsetHash)
          }
        }
      }
      this.dynamodb.scan(params, (err: any, data: DynamoDB.Types.ScanOutput) => {
        if (err) {
          reject(err)
        }
        resolve(data.Items)
      })
    })
  }
}