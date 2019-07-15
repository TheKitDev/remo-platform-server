import React, { Component } from "react";
import { Route, Redirect, Switch } from "react-router-dom";
import "./index.css";
import RobotServer from "../../layout/robotServer/robotServer";
import NavBar from "../../layout/nav/navBar";
import socket from "../../socket";
import ServerPage from "./server";
import { listRobotServers } from "../../../config/clientSettings";
import axios from "axios";
import Modal from "../../common/modal";
import "../../common/overlay.css";

export default class ServersPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      robotServers: undefined,
      selectedServer: undefined,
      socketConnected: false,
      user: undefined, // undefined: waiting for gateway, null: gateway said auth no no
      isShowing: false,
      modalContent: []
    };
  }

  onCloseModal = () => {
    this.setState({
      isShowing: false,
      modalContent: []
    });
  };

  setModal = input => {
    console.log("Modal Input: ", input);
    let updateContent = this.state.modalContent;
    input.map(getInput => updateContent.push(getInput));
    this.setState({
      isShowing: true,
      modalContent: updateContent
    });
    return null;
  };

  getServers = async () => {
    try {
      const response = await axios.get(listRobotServers);
      //console.log(response);
      this.setState({ robotServers: response.data });
    } catch (e) {
      console.error(e);
      setTimeout(this.getServers, 600); //retry
    }
  };

  async componentDidMount() {
    socket.on("VALIDATED", this.setUser);
    socket.on("connect", this.socketConnected);
    socket.on("disconnect", this.socketDisconnected);
    socket.on("ROBOT_SERVER_UPDATED", this.getServers);
    if (socket.connected) {
      this.setState({ socketConnected: true });
      this.emitAuthentication();
    }

    await this.getServers();
  }

  setServer = server => {
    this.setState({ selectedServer: server });
  };

  componentWillUnmount() {
    socket.off("VALIDATED", this.setUser);
    socket.off("connect", this.socketConnected);
    socket.off("disconnect", this.socketDisconnected);
    socket.off("ROBOT_SERVER_UPDATED", this.getServers);
  }

  emitAuthentication = () => {
    socket.emit("AUTHENTICATE", { token: localStorage.getItem("token") });
  };

  setUser = user => {
    this.setState({ user });
  };

  socketConnected = () => {
    this.setState({ socketConnected: true });
    this.emitAuthentication();
  };

  socketDisconnected = () => {
    this.setState({ socketConnected: false });
  };

  render() {
    let loadingText = null;
    console.log(this.state.socketConnected);
    if (!this.state.socketConnected) {
      loadingText = "Connecting...";
    } else if (!this.state.user) {
      loadingText = "Waiting for User...";
    } else if (!this.state.robotServers) {
      loadingText = "Waiting for Robot Servers...";
    }

    if (this.state.user === null) return <Redirect to="/login" />;

    return loadingText ? (
      <div className="ConnectingOverlay">
        <h3 className="ConnectingOverlayText">{loadingText}</h3>
      </div>
    ) : (
      <React.Fragment>
        {this.state.isShowing && (
          <React.Fragment>
            <div onClick={this.onCloseModal} className="back-drop" />
            <Modal
              className="modal"
              show={this.state.isShowing}
              close={this.onCloseModal}
              contents={this.state.modalContent}
            />
          </React.Fragment>
        )}
        <NavBar user={this.state.user} />
        <div className="server-container">
          <RobotServer
            modal={this.setModal}
            onCloseModal={this.onCloseModal}
            user={this.state.user}
            robotServers={this.state.robotServers}
            selectedServer={this.state.selectedServer}
          />
          <Switch>
            <Route
              path="/:name"
              render={props => (
                <ServerPage
                  {...props}
                  modal={this.setModal}
                  onCloseModal={this.onCloseModal}
                  user={this.state.user}
                  robotServers={this.state.robotServers}
                  selectedServer={this.state.selectedServer}
                  setServer={this.setServer}
                />
              )}
            />
            <Route
              path="/"
              render={props => (
                <NoServerPage {...props} setServer={this.setServer} />
              )}
            />
          </Switch>
        </div>
      </React.Fragment>
    );
  }
}

class NoServerPage extends Component {
  componentDidMount() {
    this.props.setServer(null);
  }

  render() {
    return <React.Fragment />;
  }
}