import './App.css';
import React, {Component} from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import {InheritorContractAddr, chainID} from './contractAssets/config'
import Inheritor from './contractAssets/Inheritor.json';
import Loading from './Loading'


class Heirs extends Component {
    state = {
        depositors: [],
        depoToClaim: ""
    }

    async componentDidMount() {
        const web3Modal = new Web3Modal();
        const connect = await web3Modal.connect();    
        this.connectChanged();
        connect.on('accountsChanged', this.connectChanged);
        connect.on('chainChanged', this.connectChanged)
        this.readDepoList()
    }

    connectChanged = async () => {
        this.setState({depositors: []})
        this.props.setMsg("")
        const connNetworkAddr = this.props.connectChanged()
        if (connNetworkAddr) {
            this.readDepoList()
        }
    }

    readDepoList = async () => {
        this.props.setMsg("")
        this.props.setTX("")
        this.props.setLoading(true)
        const web3 = new Web3Modal();
        const conn = await web3.connect();
        const provider = new ethers.providers.Web3Provider(conn);
        const contract = new ethers.Contract(InheritorContractAddr, Inheritor.abi, provider);
        try {
            const depositors = await contract.listDepos(conn.selectedAddress)
            const filteredList = depositors.filter((depo) => depo !== (ethers.constants.AddressZero) && ethers.utils.isAddress(depo));
            const vals = await contract.readDepositedValues(filteredList)
            const depositorData = [];
            for (let i = 0; i < vals[0].length; i++) {
                let amountToClaim = parseFloat(ethers.utils.formatEther(vals[0][i].toString())).toFixed(5);
                let lastCheckIn = parseFloat(vals[1][i].toString());
                let interval = parseFloat(vals[2][i].toString());
                let address = vals[3][i];
                depositorData.push({amountToClaim, lastCheckIn, interval, address });
            }
            this.setState({depositors: depositorData})
            this.props.setLoading(false)
        } catch (err) {
            console.log(err)
            this.props.setMsg(err?.data?.message || "Error Reading Depositor Data")
        }
    }


    claimInheritance = async (depoAddr) => {        
        this.props.setMsg("")
        this.props.setTX("")
        this.props.setLoading(true)
        if (!ethers.utils.isAddress(depoAddr)) return
        this.setState({depoToClaim: ""});
        const web3 = new Web3Modal();
        const conn = await web3.connect();
        const provider = new ethers.providers.Web3Provider(conn);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(InheritorContractAddr, Inheritor.abi, signer);
        try {          
            const depoList = await contract.payout(depoAddr,{gasLimit: 1000000});
            const depoListTx = await depoList.wait()
            this.readDepoList();
        } catch (err) {
            this.props.setMsg("Error Claiming Inheritance")
        }
    }

    render () {
        if (this.props.loadingState) return <Loading />
        let depositorList = (
            <div>
                <h2 style={{textAlign: "left", marginLeft: "12%"}}>{this.props.connectedWallet} listed as an heir by:</h2>
                {this.state.depositors.map((depo, idx) => {
                    let fontColor = "white";
                    if (this.state.depoToClaim === depo.address) fontColor = "#00d8ff"
                    const claimDate = new Date(depo.lastCheckIn * 1000 + depo.interval * 1000)
                    const displayDate = ((claimDate).toString().split(' GMT'))[0]
                    return (
                        <h3 style={{cursor: "pointer", color: fontColor, marginLeft: "12%", textAlign: "left"}} 
                            onClick={() => this.claimInheritance(depo.address)} 
                            onMouseEnter={() => this.setState({depoToClaim: depo.address})} 
                            onMouseLeave={() => this.setState({depoToClaim: ""})} 
                            key={idx+1}>{this.props.shortenHash(depo.address)} - {depo.amountToClaim}{this.state.depoToClaim === depo.address && new Date() > claimDate ? " CLICK TO CLAIM": " available after " + displayDate}
                        </h3>
                    )
                })}
            </div>)
        
        if (this.state.depositors.length === 0) {
            depositorList = (
                <div>
                    <h2>No depositors have listed this wallet address as an heir</h2>
                </div>
            )
        }

        return (
            <div>
                {depositorList}
            </div>
        )
    }
}

export default Heirs