import React, {Component} from 'react';
import './Loading.css'

class Loading extends Component {
    render() {
        return (
            <React.Fragment>
                <h2 style={this.props.init ? { marginTop:"30vh" } : null}>Loading...</h2>
                <div className="loadingio-spinner-blocks-l5hmgirucho">
                    <div className="ldio-khl49cewvcn">
                        <div style={{"left":"38px", "top":"38px", "animationDelay":"0s"}}></div>
                        <div style={{"left":"80px", "top":"38px", "animationDelay":"0.10593220338983052s"}}></div>
                        <div style={{"left":"122px", "top":"38px", "animationDelay":"0.21186440677966104s"}}></div>
                        <div style={{"left":"38px", "top":"80px", "animationDelay":"0.7415254237288136s"}}></div>
                        <div style={{"left":"122px", "top":"80px", "animationDelay":"0.31779661016949157s"}}></div>
                        <div style={{"left":"38px", "top":"122px", "animationDelay":"0.6355932203389831s"}}></div>
                        <div style={{"left":"80px", "top":"122px", "animationDelay":"0.5296610169491526s"}}></div>
                        <div style={{"left":"122px", "top":"122px", "animationDelay":"0.42372881355932207s"}}></div>
                    </div>
            </div>
            </React.Fragment>)
    }
}

export default Loading;