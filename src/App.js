import './App.css';
import ETH from './eth.png'
import React, {Component} from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import {InheritorContractAddr, chainID} from './contractAssets/config'
import Inheritor from './contractAssets/Inheritor.json';
import Heirs from './Heirs';
import Deposit from './Deposit';
import Loading from './Loading';
import Documentation from './Documentation';


class App extends Component {
  
  state = {
    initializing: true,
    onDepo: true,
    showDocs: true,
    connectedAddr: "",
    lastCalc: "",
    isDepo: false,
    networkConnected: "",
    connectedWallet: "",
    transactionTX: "",
    disburseTriggered: false,
    remainingHeirs: null,
    loading: true
  }
  
  //create clear error/state selections function to be called at top of each onClick func
  async componentDidMount() {
    try {
      window.ethereum.on('accountsChanged', () => this.connectChanged())
      window.ethereum.on('chainChanged', () => this.connectChanged())
      this.connectChanged();
    } catch (err) {
      console.log(err)
    }
  }

  connectChanged = async () => {
    this.setState({loading: true})
    const web3 = new Web3Modal();
    const conn = await web3.connect();
    const provider = new ethers.providers.Web3Provider(conn);
    const currChainID = (await provider._networkPromise).chainId.toString();
    if (currChainID !== this.state.networkConnected) {
      this.setState({networkConnected: currChainID, msg: ""})
    }
    if (currChainID === chainID) {
      try {
        const contract = new ethers.Contract(InheritorContractAddr, Inheritor.abi, provider);
        const availableEth = parseFloat(ethers.utils.formatEther((await provider.getBalance(conn.selectedAddress)).toString())).toFixed(5)
        const disburseTriggered = (await contract.disburseTriggered(conn.selectedAddress)).toNumber()
        let remainingHeirs = null
        if (disburseTriggered) {
          remainingHeirs = (await contract.depoToHeirsListLength(conn.selectedAddress)).toNumber()
        }
        this.setState({disburseTriggered, remainingHeirs})
        if (this.state.connectedWallet !== conn.selectedAddress) {
          this.setState({msg: "", transactionTX: "", connectedWallet: conn.selectedAddress})
        }
        const isDepo = ((await contract.depoToHeirsListLength(conn.selectedAddress)).toString() > 0)
        const isHeir = ((await contract.listDepos(conn.selectedAddress)).length > 0)
        
        if (this.state.initializing && (isDepo || isHeir || disburseTriggered)) {
          this.setState({showDocs: false})
        }

        this.setState({isDepo, heirToRemove: "", availableEth, loading: false, initializing: false})
        return true;
      } catch (err) {
        this.setState({loading: false, initializing: false})
        this.props.setMsg(err?.data?.message || "Error Changing Connection")
      }
    }
    this.setState({loading: false, initializing: false})
    return false;
  }


  eventMsgHandle = (tx) => {
    if (tx?.events?.length > 0) {
      let errorMsg = "";
      tx.events.forEach(e => {
        errorMsg += e?.args?.msg + '\n';
      })
      this.setState({msg: errorMsg, loading: false});
    } else {
      this.setState({loading: false})
    }
  }

  claimInheritance = async (depoAddr) => {
    this.setState({transactionTX: ""})
    if (!ethers.utils.isAddress(depoAddr)) {
      return this.setState({msg: "Depositor address invalid!"})
    }

    this.setState({loading: true})
    const web3 = new Web3Modal();
    const conn = await web3.connect();
    const provider = new ethers.providers.Web3Provider(conn);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(InheritorContractAddr, Inheritor.abi, signer);
    try {
      const claimGasEst = (await contract.estimateGas.claimInheritance(depoAddr, 200000)).toString()
      const depoList = await contract.claimInheritance(depoAddr, claimGasEst);
      await depoList.wait()
      this.connectChanged();
      const disburseTriggered = (await contract.disburseTriggered(conn.selectedAddress)).toNumber()
      let remainingHeirs = null
      if (disburseTriggered) {
        remainingHeirs = (await contract.depoToHeirsListLength(conn.selectedAddress)).toNumber()
      }
      this.setState({remainingHeirs, disburseTriggered, loading: false})
    } catch (err) {
        this.setMsg(err?.data?.message || "Transaction Error")
    }
  }

  setLoading = (bool) => {
    this.setState({loading: bool})
  }

  setMsg = (msg) => {
    this.setState({msg: msg, loading: false})
  }

  setTX = (tx) => {
    this.setState({transactionTX: tx || ""})
  }

  handleOutsideModalClick = (target) => {
    if (target.className !== "modal" && target.parentElement.className !== "modal") {
      this.setState({showDocs: false})
    }
  }

  shortenHash = (hash) => {
    const hashLen = hash.length
    return hash.slice(0,7) + "..." + hash.slice(hashLen - 6, hashLen)
  }

  render() {
    if (this.state.initializing){
      if (this.state.networkConnected !== chainID || !this.state.connectedWallet) {
        return (<div>
            <Loading init={this.state.initializing}/>
            <h1>Please connect a Web3 wallet to the Ethereum Rinkeby testnet (Chain 4)</h1>
          </div>)
      } else {
        return <div><Loading init={this.state.initializing}/></div>
      }
    }
    if (this.state.networkConnected !== chainID) {
      return (
        <div>
          <h2>Please connect a Web3 wallet to the Ethereum Rinkeby testnet (Chain 4)</h2>
        </div>
      )
    }

    if (!this.state.connectedWallet) {
      return (
        <div>
          <h2>Please connect your wallet to this Dapp</h2>
        </div>
      )
    }

    return (
      <div className="App" onClick={this.state.showDocs ? (e) => this.handleOutsideModalClick(e.target) : null}>
        {this.state.showDocs ? <Documentation closeDocs={() => this.setState({showDocs: false})} /> : null}
        <div style={{display: "flex", width: "100%", justifyContent: "space-between", height: "90px", backgroundColor: "#00d8ff"}}>
          <div style={{display: "flex"}}>
            <h2 style={{marginBottom: 0, fontSize: "38px", color: "#282c34", paddingLeft: "15px"}}>EthHeritance</h2>
            <img style={{marginLeft: "15px", marginTop: "5px"}} height="80px" src={ETH}/>
          </div>
          <div style={{height: "100%", alignItems: "center"}}>
            <div style={{marginTop: "27px", marginRight: "20px", display: "flex"}}>
              <button type="none" onClick={() => this.setState({showDocs: true})}>Display Documentation</button>
              <div className="btn" style={{backgroundColor: "white", color: "#282C34"}}>Wallet: <a style={{color: "#282C34"}} href={"https://rinkeby.etherscan.io/address/" + this.state.connectedWallet}>{this.shortenHash(this.state.connectedWallet)}</a></div>
            </div>
          </div>
        </div>
        <div className="modes" style={{width: "100%", display: "flex"}}>
          <h2 onClick={() => this.setState({onDepo: true})} style={this.state.onDepo ? {textDecoration: "underline"} : null}>Manage Deposit</h2>
          <h2 onClick={() => this.setState({onDepo: false})} style={!this.state.onDepo ? {textDecoration: "underline"} : null}>Heir Claims</h2>
        </div>
        <div style={{height: "80px", margin: "5px"}}>
          {this.state.msg ? <h1 style={{margin: 0}}>{this.state.msg}</h1> : null}
        </div>
        <div style={{height: "40px", margin: "5px"}}>
          {this.state.transactionTX ? (
            <div style={{ borderBottom: "white 2px solid", width: "86%", margin: "3px 7% 10px 7%" }}>
              <h2 style={{margin: 0, paddingBottom: "3px", color: "#00d8ff"}}>Transaction: <a style={{color: "#00d8ff"}} href={"https://rinkeby.etherscan.io/tx/" + this.state.transactionTX}>{this.shortenHash(this.state.transactionTX)}</a></h2> 
            </div>
          ): null}
        </div>

        {!this.state.onDepo ? (
          <Heirs 
            eventMsgHandle={(tx) => this.eventMsgHandle(tx)}
            connectChanged={() => this.connectChanged()}
            setLoading={(bool) => this.setLoading(bool)}
            setMsg={(msg) => this.setMsg(msg)}
            setTX={(tx) => this.setTX(tx)}
            shortenHash={(hash) => this.shortenHash(hash)}
            loadingState={this.state.loading}
            connectedWallet={this.state.connectedWallet}
            msg={this.state.msg}
          />)
        : null}
        {this.state.onDepo ? (
          <Deposit 
            eventMsgHandle={(tx) => this.eventMsgHandle(tx)}
            connectChanged={() => this.connectChanged()}
            setLoading={(bool) => this.setLoading(bool)}
            setMsg={(msg) => this.setMsg(msg)}
            setTX={(tx) => this.setTX(tx)}
            isDepoTrue={() => this.setState({isDepo: true})}
            disburseTriggered={this.state.disburseTriggered}
            remainingHeirs={this.state.remainingHeirs}
            availableEth={this.state.availableEth}
            loadingState={this.state.loading}
            isDepo={this.state.isDepo}
            msg={this.state.msg}
          />) 
        : null}
      </div>
    )
  }
}

export default App;