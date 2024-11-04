import { Contract } from '@algorandfoundation/tealscript';

export class VoltPay extends Contract {
  points = LocalStateKey<uint64>();

  optInToApplication(): void {}

  /**
   * This method is called by a person that wants to make a VTU payment
   * @param paymentTxn The transaction containing payment for the VTU request
   * @param phone The phone number for the request.
   * @param operator The VTU operator 
   * @param type The VTU type
   * @param value The VTU value
   */
  makeVtuPayment(paymentTxn: PayTxn, phone: string, operator: string, type: string, value: string): void {
    assert(paymentTxn.receiver === this.app.address, 'Receiver should be the app address');
    assert(this.txn.sender === paymentTxn.sender, 'Sender should be the caller of this method');
    assert(paymentTxn.amount > 0, 'No zero amount transfers');

    this.points(paymentTxn.sender).value = this.points(paymentTxn.sender).value + paymentTxn.amount;

    sendPayment({
      receiver: this.app.creator,
      amount: paymentTxn.amount,
    });
  }

  /**
  * This revokes the points of a user in the event of 
  * a refund.
  * @param refundTransaction The transaction refunding the user.
  */
  revokePoints(refundTransaction: PayTxn): void {
    assert(this.txn.sender === this.app.creator);
    assert(this.points(refundTransaction.receiver).exists, 'This target account does not have any points');
    assert(this.points(refundTransaction.receiver).value >= refundTransaction.amount);
    assert(refundTransaction.amount > 0);

    this.points(refundTransaction.receiver).value = this.points(refundTransaction.receiver).value - refundTransaction.amount;
  }
}
