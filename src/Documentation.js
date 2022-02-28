import React, {Component} from 'react';
import './Documentation.css'

class Documentation extends Component {
    render() {
        return (
            <div className="modal">
                <div>
                    <p>EthHeritance is a dApp where a depositor stakes Eth into the smart contract and upon triggering a dead-man's switch is divided and sent to all listed heir addresses.</p>
                    <p>This app runs on the Ethereum Rinkeby Testnet.</p>
                    <p>The staked Eth earns 400 HeirCoin per Eth per day, to be divided between heirs upon disbursal.</p>
                    <p>The depositor chooses a check in interval upon initiation (For testing purposes, the interval is measured by minutes). This is the period of time the depositor must make an action before fund disbursal.</p>
                    <p>Additional deposits, heir list changes, and manual check ins are considered actions that restart the countdown to disbursal.</p>
                    <p>If the specified interval has passed since the last action, any listed heir may make a claim and begin disbursal.</p>
                    <p>Check in deadline has passed but the depositor checks in before any claims have been made, the check in time is updated but a 20% penalty is taken from the reward token balance.</p>
                    <p>Before any heirs have made a claim, the depositor may withdraw the staked balance of eth.</p>
                    <p>Once the disbursal process is triggered, the depositor is locked out from performing any actions and reward accumulation is halted</p>
                </div>
                <div className="btn" style={{margin: "8px 170px", border: "2px #00d8ff solid", cursor: "pointer"}} onClick={() => this.props.closeDocs()} >CLOSE</div>
            </div>)
    }
}

export default Documentation;