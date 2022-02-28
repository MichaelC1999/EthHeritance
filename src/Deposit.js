import './App.css';
import React, { Component } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import { InheritorContractAddr, chainID } from './contractAssets/config'
import Inheritor from './contractAssets/Inheritor.json';
import Loading from './Loading';


class Deposit extends Component {
    state = {
        heirsListed: [],
        heirToAdd: "",
        heirToRemove: "",
        ethAmount: "",
        intervalInMins: "",
        depositedValue: 0,
        lastCalc: 0,
        rewardBalance: 0,
        step: 0
    }

    alreadyUsedAddrs = [];

    async componentDidMount() {
        const web3Modal = new Web3Modal();
        const connect = await web3Modal.connect();
        this.connectChanged();
        connect.on('accountsChanged', this.connectChanged);
        connect.on('chainChanged', this.connectChanged)
    }

    connectChanged = async () => {
        const connNetworkAddr = this.props.connectChanged()
        this.setState({
            heirsListed: [],
            heirToAdd: "",
            heirToRemove: "",
            ethAmount: "",
            intervalInMins: "",
            depositedValue: 0,
            lastCalc: 0,
            rewardBalance: 0,
            step: 0
        })
        this.props.setLoading(true)
        if (connNetworkAddr) {
            const web3 = new Web3Modal();
            const conn = await web3.connect();
            const provider = new ethers.providers.Web3Provider(conn);
            const contract = new ethers.Contract(InheritorContractAddr, Inheritor.abi, provider);
            try {
                let depositedValue = (await contract.depositedValue(conn.selectedAddress)).toString()
                depositedValue = parseFloat(ethers.utils.formatEther(depositedValue)).toFixed(5)
                let lastCalc = await contract.lastCheckIn(conn.selectedAddress)
                lastCalc = lastCalc * 1000
                let rewardBalance = await contract.rewardBalance(conn.selectedAddress)
                rewardBalance = (rewardBalance.toString())
                this.setState({ depositedValue, lastCalc, rewardBalance })
                const listHeirs = await contract.listHeirs(conn.selectedAddress)
                this.setAlreadyUsedAddrs(listHeirs)
            } catch (err) {
                this.props.setMsg(err?.data?.message || "Error Loading Wallet Data")
            }
        }
    }

    setAlreadyUsedAddrs = (listHeirs) => {
        this.alreadyUsedAddrs = listHeirs;
        this.setState({ heirsListed: listHeirs.filter(x => {return x !== ethers.constants.AddressZero} ), heirToAdd: "", heirToRemove: "" })
    }

    stake = async () => {
        this.props.setMsg("")
        this.props.setTX("")
        this.props.setLoading(true)
        if (!this.state.ethAmount) {
            this.props.setMsg("No amount input to stake")
            return
        }
        if (parseFloat(this.state.ethAmount) > parseFloat(this.props.availableEth)) {
            this.props.setMsg("Wallet Balance Too Low")
            return
        }
        const web3 = new Web3Modal();
        const conn = await web3.connect();
        const provider = new ethers.providers.Web3Provider(conn);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(InheritorContractAddr, Inheritor.abi, signer);
        if (this.props.isDepo) {
            this.stakeMore(contract)
        } else {
            this.initStake(contract)
        }
    }

    stakeMore = async (contract) => {
        try {
            const price = ethers.utils.parseUnits(this.state.ethAmount.toString(), 'ether');
            const deposit = await contract.deposit({ value: price.toString(), gasLimit: 100000 })
            const depositTx = await deposit.wait();
            this.connectChanged()
            this.props.setTX(depositTx.transactionHash)
            this.props.eventMsgHandle(depositTx)
        } catch (err) {
            this.props.setMsg(err?.message || "Staking Error")
        }
    }

    initStake = async (contract) => {
        if (this.state.heirsListed.length === 0) {
            if (ethers.utils.isAddress(this.state.heirToAdd)) {
                this.setState({ heirsListed: [this.state.heirToAdd], heirToAdd: "" });
            } else {
                this.props.setMsg("Need to add heirs")
                return
            }
        }
        if (!this.state.intervalInMins) {
            this.props.setMsg("Need to set an interval")
            return
        }
        const price = ethers.utils.parseUnits(this.state.ethAmount.toString(), 'ether');
        try {
            const initDeposit = await contract.initialDeposit(this.state.heirsListed, (this.state.intervalInMins * 60), { value: price.toString(), gasLimit: 1000000 })
            const initDepositTx = await initDeposit.wait()
            const listHeirs = await contract.listHeirs(window.ethereum.selectedAddress)
            this.setAlreadyUsedAddrs(listHeirs)
            this.setState({ intervalInMins: "" })
            this.props.isDepoTrue()
            this.connectChanged()
            this.props.setTX(initDepositTx.transactionHash)
            this.props.eventMsgHandle(initDepositTx)
        } catch (err) {
            this.props.setMsg(err?.message || "Initial Deposit Error")
        }
    }

    submitNewHeirs = async () => {
        this.props.setLoading(true)
        const heirsToSubmit = [];
        this.state.heirsListed.forEach(heir => {
            if (!this.alreadyUsedAddrs.includes(heir) && ethers.utils.isAddress(heir) && heir !== ethers.constants.AddressZero) heirsToSubmit.push(heir);
        })
        // Also needs block if no deposit has been made by the current address
        if (heirsToSubmit.length === 0) {
            this.props.setMsg("No new heirs listed")
            return
        }
        this.props.setMsg("")
        this.props.setTX("")
        const web3 = new Web3Modal();
        const conn = await web3.connect();
        const provider = new ethers.providers.Web3Provider(conn);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(InheritorContractAddr, Inheritor.abi, signer);
        try {
            const listHeirs = await contract.listHeirs(conn.selectedAddress)
            const addHeir = await contract.addHeirs(heirsToSubmit, false, {gasLimit: 200000})
            const tx = await addHeir.wait()
            this.props.setTX(tx.transactionHash)
            this.props.setMsg("Users added successfully")
            this.setAlreadyUsedAddrs(listHeirs)
        } catch (err) {
            this.props.setMsg(err?.data?.message || "Error Adding Users")
        }
    }

    addHeirToList = async () => {
        this.props.setTX("")
        if (!ethers.utils.isAddress(this.state.heirToAdd)) return this.props.setMsg("Not an actual address! Verify the address is correct");
        if (ethers.utils.getAddress(this.state.heirToAdd) === ethers.utils.getAddress(window.ethereum.selectedAddress)) return this.props.setMsg("Cannot use connected address as an heir");
        if (this.state.heirsListed.includes(this.state.heirToAdd)) return this.props.setMsg("Address already in heirs list");
        const newHeir = this.state.heirToAdd;
        this.props.setMsg("")
        this.setState({ heirToRemove: "", heirToAdd: "", heirsListed: [...this.state.heirsListed, newHeir] })
    }


    removeHeir = async (idx, addr) => {
        this.props.setLoading(true)
        this.props.setMsg("")
        this.props.setTX("")
        if (!this.alreadyUsedAddrs.includes(addr)) {
            let updatedHeirList = this.state.heirsListed
            updatedHeirList.splice(idx, 1)
            return this.setState({ heirsListed: updatedHeirList, loading: false })
        }
        const web3 = new Web3Modal();
        const conn = await web3.connect();
        const provider = new ethers.providers.Web3Provider(conn);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(InheritorContractAddr, Inheritor.abi, signer);
        try {
            const listHeirs = await contract.listHeirs(conn.selectedAddress)
            const removeHeir = await contract.removeHeir(addr, {gasLimit: 200000})
            const tx = await removeHeir.wait()
            this.props.setTX(tx.transactionHash)
            this.connectChanged()
            this.props.setMsg("User Removed")
            this.setAlreadyUsedAddrs(listHeirs)
        } catch (err) {
            this.props.setMsg(err?.data?.message || "Error Removing User")
        }
    }

    removeHeirMsg = (addr) => {
        if (this.props.disburseTriggered) return
        this.props.setMsg("Do you want to remove heir " + addr + "? Click the address again to submit")
        this.props.setTX("")
        this.setState({ heirToRemove: addr })
    }

    checkIn = async () => {
        this.props.setMsg("")
        this.props.setTX("")
        this.props.setLoading(true)
        try {
            const web3 = new Web3Modal();
            const conn = await web3.connect();
            const provider = new ethers.providers.Web3Provider(conn);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(InheritorContractAddr, Inheritor.abi, signer);
            const checkIn = await contract.checkInReward({gasLimit: 200000});
            const checkInTx = await checkIn.wait()
            this.props.setTX(checkInTx.transactionHash)
            this.props.setLoading(false)
            this.connectChanged()
        } catch (err) {
            this.props.setMsg(err?.data?.message || "Transaction Error")
        }
    }

    earlyWithdrawl = async () => {
        this.props.setMsg("")
        this.props.setTX("")
        this.props.setLoading(true)
        try {
            const web3 = new Web3Modal();
            const conn = await web3.connect();
            const provider = new ethers.providers.Web3Provider(conn);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(InheritorContractAddr, Inheritor.abi, signer);
            const earlyWithdrawl = await contract.earlyWithdrawl({gasLimit: 1000000 });
            const tx = await earlyWithdrawl.wait()
            this.props.setTX(tx.transactionHash)
            this.props.setLoading(false)
            this.connectChanged();
        } catch (err) {
            this.props.setMsg(err?.error?.message || "Transaction Error")
        }
    }

    handleStepIncrease = () => {
        this.props.setMsg("")
        if (!(this.state.ethAmount > 0)) {
            this.setState({ step: 0 })
            this.props.setMsg("No Eth amount given");
            return;
        }
        if (parseFloat(this.state.ethAmount) > parseFloat(this.props.availableEth)) {
            this.setState({ step: 0 })
            this.props.setMsg("Eth balance too low");
            return;
        }

        if (this.state.step >= 1 && !(this.state.intervalInMins > 0)) {
            this.setState({ step: 1 })
            this.props.setMsg("No check in interval provided")
            return;
        }
        
        if (this.state.step < 2) {
            this.props.setTX("")
            return this.setState({ step: this.state.step + 1 })
        } else {
            this.stake();
        }
    }

    render() {
        if (this.props.loadingState) {
            return <Loading />
        }

        if (this.props.disburseTriggered && !this.props.remainingHeirs) {
            return (
                <div>
                    <h2>Current connected address has already been used as a depositor. All value has been released.</h2>
                </div>
            )
        }

        if (this.props.isDepo) {
            let calcDate = 0

            if (this.state.lastCalc > 0) {
                calcDate = new Date(this.state.lastCalc)
                calcDate = calcDate.toString().split(" GMT")[0]
            }
            let rewardText = ""
            if (this.state.rewardBalance > 0) {
                rewardText = this.state.rewardBalance + " HeirCoin - ";
            }
            let calcElement = <div style={{ borderBottom: "white 2px solid", paddingBottom: "10px", width: "86%", margin: "3px 7%" }}><h2>{rewardText}Last check in at {calcDate}</h2></div>

            let submitHeirBtn = null;
            const heirsToSubmit = [];
            this.state.heirsListed.forEach(heir => {
                if (!this.alreadyUsedAddrs.includes(heir) && ethers.utils.isAddress(heir) && heir !== ethers.constants.AddressZero) heirsToSubmit.push(heir);
            })
            // Also needs block if no deposit has been made by the current address
            if (heirsToSubmit.length !== 0) {
                submitHeirBtn = <button type="none" onClick={() => this.submitNewHeirs()} >Submit Heirs</button>
            }

            let addHeirsSection = (
                <React.Fragment>
                    <input type="string" value={this.state.heirToAdd} placeholder="Add a Heir" onChange={(e) => this.setState({ heirToAdd: e.target.value })} />
                    <button type="none" onClick={() => this.addHeirToList()} >Add Heir</button>
                </React.Fragment>
            )
            let depositSection = (
                <React.Fragment>
                    <div style={{ borderBottom: "white 2px solid", width: "86%", margin: "3px 7% 20px 7%" }}>
                        <h2>Available Eth in this wallet: {this.props.availableEth}</h2>
                        <input type="string" value={this.state.ethAmount} placeholder="Deposit Amount in ETH" onChange={(e) => this.setState({ ethAmount: e.target.value })} />
                        <button type="none" onClick={() => this.stake()} >Stake</button>
                    </div>
                </React.Fragment>
            )
            let miscActions = (
                <div style={{ borderBottom: "white 2px solid", paddingBottom: "20px", width: "86%", margin: "3px 7%" }}>
                    <button onClick={() => this.checkIn()}>Check In</button>
                    <button onClick={() => this.earlyWithdrawl()}>Early Stake Withdrawl</button>
                </div>
            )
            let remainingLabel = null
            if (this.props.disburseTriggered) {
                remainingLabel = <h2>Remaining Heirs on this inheritance:</h2>
                addHeirsSection = null
                depositSection = null
                calcElement = null
                miscActions = <h2>Once a heir has made a claim after the check in period has passed, the depositor can take no more actions</h2>
            }
            return (
                <div>
                    <h2>{this.state.depositedValue} ETH currently deposited</h2>
                    {depositSection}
                    <div style={{ borderBottom: "white 2px solid", paddingBottom: "8px", width: "86%", margin: "2px 7%" }}>
                        {addHeirsSection}
                        {remainingLabel}
                        {this.state.heirsListed.map((addr, idx) => {
                            let fontColor = "white";
                            if (!this.alreadyUsedAddrs.includes(addr)) fontColor = "#00d8ff"
                            if (this.state.heirToRemove === addr) fontColor = "red"
                            if (this.state.heirsListed.length > 1) {
                                return (
                                    <div>
                                        <h3 style={{ color: fontColor, marginLeft: "27%", textAlign: "left" }}
                                            onClick={() => this.removeHeir(idx, addr)}
                                            onMouseEnter={() => this.setState({ heirToRemove: addr })}
                                            onMouseLeave={() => this.setState({ heirToRemove: "" })}
                                            key={idx}>--- {addr}{this.state.heirToRemove === addr && !this.props.disburseTriggered ? " CLICK TO DELETE" : ""}
                                        </h3>
                                    </div>
                                )
                            } else {
                                return (
                                    <h3 style={{ color: "white" }}
                                        key={idx}>
                                        --- {addr}
                                    </h3>
                                )
                            }
                        })}
                        {submitHeirBtn}
                    </div>
                    {calcElement}
                    {miscActions}
                </div>
            )
        } else {
            if (this.state.step === 0) {
                return (
                    <div>
                        <h2>Set up an initial deposit. Put in amount of ETH to deposit</h2>
                        <h2>Available Eth in this wallet: {this.props.availableEth}</h2>

                        <input type="string" autoFocus value={this.state.ethAmount} placeholder="Deposit Amount in ETH" onChange={(e) => this.setState({ ethAmount: e.target.value })} />
                        <div style={{ justifyContent: "center", margin: 0 }} className="modes">
                            <button style={{}} type="none" onClick={() => this.handleStepIncrease()} >Next</button>
                        </div>
                    </div>)
            } else if (this.state.step === 1) {
                return (
                    <div>
                        <h2>Set interval</h2>
                        <input type="string" autoFocus value={this.state.intervalInMins} placeholder="Interval in Minutes" onChange={(e) => this.setState({ intervalInMins: e.target.value })} />
                        <div className="modes">
                            <button type="none" onClick={() => this.setState({ step: 0 })} >Back</button>
                            <button type="none" onClick={() => this.handleStepIncrease()} >Next</button>
                        </div>
                    </div>)
            } else if (this.state.step === 2) {
                return (
                    <div>
                        <h2>Add heirs</h2>
                        <div>
                            <input type="string" autoFocus style={{ border: "1px whitesmoke solid", borderRadius: "3px" }} value={this.state.heirToAdd} onChange={(e) => this.setState({ heirToAdd: e.target.value })} />
                            <button type="none" onClick={() => this.addHeirToList()} >Add To List</button>

                            {this.state.heirsListed.map((addr, idx) => {
                                let fontColor = "white";
                                if (!this.alreadyUsedAddrs.includes(addr)) fontColor = "#00d8ff"
                                if (this.state.heirToRemove === addr) fontColor = "red"
                                return (
                                    <h3 style={{ color: fontColor, marginLeft: "29%", textAlign: "left" }}
                                        onClick={() => this.removeHeir(idx, addr)}
                                        onMouseEnter={() => this.setState({ heirToRemove: addr })}
                                        onMouseLeave={() => this.setState({ heirToRemove: "" })}
                                        key={idx}>--- {addr}{this.state.heirToRemove === addr ? " CLICK TO DELETE" : ""}
                                    </h3>
                                )
                            })}
                        </div>
                        <div className="modes">
                            <button type="none" onClick={() => this.setState({ step: 1 })} >Back</button>
                            <button type="none" onClick={() => this.handleStepIncrease()} >Stake</button>
                        </div>
                    </div>
                )
            }
        }
    }
}

export default Deposit;