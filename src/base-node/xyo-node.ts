/*
 * @Author: XY | The Findables Company <xyo-network>
 * @Date:   Friday, 8th February 2019 3:47:53 pm
 * @Email:  developer@xyfindables.com
 * @Filename: xyo-node.ts

 * @Last modified time: Wednesday, 13th March 2019 4:07:06 pm
 * @License: All Rights Reserved
 * @Copyright: Copyright XY | The Findables Company
 */

import { XyoBase } from '@xyo-network/base'
import { receiveProcedureCatalogue } from './xyo-recive-catalog'
import {
    XyoServerTcpNetwork,
    XyoFileOriginStateRepository,
    XyoMemoryBlockRepository,
    XyoOriginState,
    XyoSha256,
    XyoOriginPayloadConstructor,
    XyoZigZagBoundWitnessHander,
    XyoSecp2556k1,
    XyoGenesisBlockCreator,
    XyoNetworkHandler,
    XyoBoundWitnessInserter} from '@xyo-network/sdk-core-nodejs'
import { IXyoNodeConfig } from './@types'
import _ from 'lodash'

export class XyoNode extends XyoBase {

  private static testProcedureCatalog: IXyoProcedureCatalogue = {
    getEncodedCanDo: () => {
      return Buffer.from('01', 'hex')
    },
    choose: () => {
      return Buffer.from('01', 'hex')
    },
    canDo: (buffer: Buffer) => {
      return true
    }
  }

  public network: XyoServerTcpNetwork
  public stateRepo: XyoFileOriginStateRepository
  public blockRepo: XyoMemoryBlockRepository
  public state: XyoOriginState
  public hasher: XyoSha256
  public inserter: XyoBoundWitnessInserter
  public payloadProvider: XyoOriginPayloadConstructor
  public handler: XyoZigZagBoundWitnessHander

  constructor(config: IXyoNodeConfig) {
    super()
    this.network = new XyoServerTcpNetwork(_.get(config, 'network.port', 4141))
    this.stateRepo = new XyoFileOriginStateRepository(_.get(config, 'originStateRepository.path', './test-state.json'))
    this.blockRepo = new XyoMemoryBlockRepository()
    this.state = new XyoOriginState(this.stateRepo)
    this.hasher = new XyoSha256()
    this.inserter = new XyoBoundWitnessInserter(this.hasher, this.state, this.blockRepo)
    this.payloadProvider = new XyoOriginPayloadConstructor(this.state)
    this.handler = new XyoZigZagBoundWitnessHander(this.payloadProvider)
  }

  public async start() {
    this.state.addSigner(new XyoSecp2556k1())

    if (this.state.getIndexAsNumber() === 0) {
      const genesisBlock =  await XyoGenesisBlockCreator.create(this.state.getSigners(), this.payloadProvider)
      console.log(`Created genesis block with hash: ${genesisBlock.getHash(this.hasher).getAll().getContentsCopy().toString('hex')}`)
      this.inserter.insert(genesisBlock)
    }

    this.network.onPipeCreated = async(pipe) => {
      console.log('New request!')
      try {
        const networkHandle = new XyoNetworkHandler(pipe)
        const boundWitness = await this.handler.boundWitness(networkHandle, receiveProcedureCatalogue, this.state.getSigners())

        if (boundWitness) {
          this.inserter.insert(boundWitness)
        }

        pipe.close()
      } catch (error) {
        console.log(`Error creating bound witness: ${error}`)
      }
    }

    this.network.startListening()
  }

  public async stop() {
    this.network.stopListening()
  }
}
