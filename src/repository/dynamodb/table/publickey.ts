/*
 * File: main-table.ts
 * Project: @xyo-network/sdk-archivist-nodejs
 * File Created: Tuesday, 23rd April 2019 8:14:51 am
 * Author: XYO Development Team (support@xyo.network)
 * -----
 * Last Modified: Thursday, 25th April 2019 3:24:48 pm
 * Modified By: XYO Development Team (support@xyo.network>)
 * -----
 * Copyright 2017 - 2019 XY - The Persistent Company
 */

import { Table } from './table'
import { DynamoDB } from 'aws-sdk'

export class PublicKeyTable extends Table {

  constructor(
    tableName: string = 'xyo-archivist-publickey',
    region: string = 'us-east-1'
  ) {
    super(tableName, region)
    this.createTableInput = {
      AttributeDefinitions: [
        {
          AttributeName: 'PublicKey',
          AttributeType: 'B'
        },
        {
          AttributeName: 'BlockHash',
          AttributeType: 'B'
        }
      ],
      KeySchema: [
        {
          AttributeName: 'PublicKey',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'BlockHash',
          KeyType: 'RANGE'
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      },
      TableName: tableName
    }
  }

  public async putItem(
    key: Buffer,
    hash: Buffer
  ): Promise<void> {
    return new Promise<void>((resolve: any, reject: any) => {
      try {
        const params: DynamoDB.Types.PutItemInput = {
          Item: {
            PublicKey: {
              B: key
            },
            BlockHash: {
              B: hash
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
        this.logError(ex)
        reject(ex)
      }
    })
  }

  public async scanByKey(key: Buffer, limit: number, offsetHash?: Buffer | undefined): Promise <{items: any[], total: number}> {
    return new Promise<{items: any[], total: number}>((resolve: any, reject: any) => {
      try {
        const params: DynamoDB.Types.QueryInput = {
          Limit: limit,
          KeyConditionExpression: 'PublicKey = :key',
          ExpressionAttributeValues: {
            ':key': { B: key }
          },
          TableName: this.tableName
        }
        if (offsetHash) {
          params.ExclusiveStartKey = {
            BlockHash: {
              B: offsetHash
            },
            PublicKey: {
              B: key
            }
          }
        }
        this.dynamodb.query(params, async(err: any, data: DynamoDB.Types.ScanOutput) => {
          if (err) {
            this.logError(err)
            reject(err)
          }
          const result = []
          if (data && data.Items) {
            for (const item of data.Items) {
              if (item.PublicKey && item.PublicKey.B && item.BlockHash && item.BlockHash.B) {
                result.push(item.BlockHash.B)
              } else {
                this.logError(`Result with Missing PublicKey or BlockHash: ${item}`)
              }
            }
          }
          resolve({ items: result, total: await this.getRecordCount() })
        })
      } catch (ex) {
        this.logError(ex)
        reject(ex)
      }
    })
  }
}
