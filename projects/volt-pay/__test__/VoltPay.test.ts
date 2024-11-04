import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import { VoltPayClient } from '../contracts/clients/VoltPayClient';
import algosdk, { makePaymentTxnWithSuggestedParamsFromObject } from 'algosdk';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let appClient: VoltPayClient;
let creator: algosdk.Account;
let receiver: algosdk.Account;
let algod: algosdk.Algodv2;

describe('VoltPay', () => {
  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();
    const { testAccount } = fixture.context;
    const { algorand } = fixture;

    creator = testAccount;
    algod = algorand.client.algod;

    receiver = await algokit.getOrCreateKmdWalletAccount({
      name: 'receiver' + Math.floor(Math.random() * 100),
      fundWith: algokit.algos(1000),
    }, algorand.client.algod, algorand.client.kmd);

    appClient = new VoltPayClient(
      {
        sender: testAccount,
        resolveBy: 'id',
        id: 0,
      },
      algorand.client.algod
    );

    await appClient.create.createApplication({});

    await appClient.appClient.fundAppAccount({ amount: algokit.microAlgos(100_000) })
  });

  test('optin accounts to app', async () => {
    await appClient.optIn.optInToApplication(
      {},
      {
        sender: receiver,
      },
    );
  });

  test('test vtu payment', async () => {
    const suggestedParams = await algokit.getTransactionParams(undefined, algod);
    const { appAddress } = await appClient.appClient.getAppReference();
    
    const paymentTxn = makePaymentTxnWithSuggestedParamsFromObject({
      from: receiver.addr,
      to: appAddress,
      amount: algokit.algos(20).microAlgos,
      suggestedParams,
    });

    await appClient.makeVtuPayment({ 
      paymentTxn: {
        transaction: paymentTxn,
        signer: receiver,
      },
      phone: '08149585413',
      operator: 'MTN_NG',
      type: 'AIRTIME',
      value: '50gb'
    }, {
      sender: receiver,
      sendParams: {
        fee: algokit.microAlgos(2_000)
      }
    });

    const points = (await appClient.getLocalState(receiver.addr)).points?.asNumber();

    expect(points).toEqual(algokit.algos(20).microAlgos);
  });

  test('second payment', async () => {
    const suggestedParams = await algokit.getTransactionParams(undefined, algod);
    const { appAddress } = await appClient.appClient.getAppReference();
    
    const paymentTxn = makePaymentTxnWithSuggestedParamsFromObject({
      from: receiver.addr,
      to: appAddress,
      amount: algokit.algos(10).microAlgos,
      suggestedParams,
    });

    await appClient.makeVtuPayment({ 
      paymentTxn: {
        transaction: paymentTxn,
        signer: receiver,
      },
      phone: '08149585413',
      operator: 'MTN_NG',
      type: 'AIRTIME',
      value: '50gb'
    }, {
      sender: receiver,
      sendParams: {
        fee: algokit.microAlgos(2_000)
      }
    });

    const points = (await appClient.getLocalState(receiver.addr)).points?.asNumber();

    expect(points).toEqual(algokit.algos(30).microAlgos);
  });

  test('refund', async () => {
    const suggestedParams = await algokit.getTransactionParams(undefined, algod);
    
    const paymentTxn = makePaymentTxnWithSuggestedParamsFromObject({
      from: creator.addr,
      to: receiver.addr,
      amount: algokit.algos(20).microAlgos,
      suggestedParams,
    });

    await appClient.revokePoints({ 
      refundTransaction: {
        transaction: paymentTxn,
        signer: creator,
      },
    }, {
      sender: creator,
      sendParams: {
        fee: algokit.microAlgos(2_000)
      }
    });

    const points = (await appClient.getLocalState(receiver.addr)).points?.asNumber();

    expect(points).toEqual(algokit.algos(10).microAlgos);
  });

  test('refund 2', async () => {
    const suggestedParams = await algokit.getTransactionParams(undefined, algod);
    
    const paymentTxn = makePaymentTxnWithSuggestedParamsFromObject({
      from: creator.addr,
      to: receiver.addr,
      amount: algokit.algos(10).microAlgos,
      suggestedParams,
    });

    await appClient.revokePoints({ 
      refundTransaction: {
        transaction: paymentTxn,
        signer: creator,
      },
    }, {
      sender: creator,
      sendParams: {
        fee: algokit.microAlgos(2_000)
      }
    });

    const points = (await appClient.getLocalState(receiver.addr)).points?.asNumber();

    expect(points).toEqual(algokit.algos(0).microAlgos);
  });

  test('over refund', async () => {
    const suggestedParams = await algokit.getTransactionParams(undefined, algod);
    
    const paymentTxn = makePaymentTxnWithSuggestedParamsFromObject({
      from: creator.addr,
      to: receiver.addr,
      amount: algokit.algos(10).microAlgos,
      suggestedParams,
    });

    await expect(appClient.revokePoints({ 
      refundTransaction: {
        transaction: paymentTxn,
        signer: creator,
      },
    }, {
      sender: creator,
      sendParams: {
        fee: algokit.microAlgos(2_000)
      }
    })).rejects.toThrow()

    const points = (await appClient.getLocalState(receiver.addr)).points?.asNumber();

    expect(points).toEqual(algokit.algos(0).microAlgos);
  });
});
