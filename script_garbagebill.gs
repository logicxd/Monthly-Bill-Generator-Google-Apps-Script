const script_garbagebill = {
  displayName: 'Garbage',
  labelName: 'Automated/HomeBill/Garbage',
  parse: function () {
    const constantGarbageBillAmount = parseFloat(35)
    return {
      billAmount: constantGarbageBillAmount,
      billDescription: `Garbage: $${constantGarbageBillAmount} (fixed monthly)`
    }
  }
}
