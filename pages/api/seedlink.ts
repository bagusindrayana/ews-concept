// pages/api/seedlink.js
import { Server } from "socket.io";
import startSeedLinkClient from "../../utils/seedlinkClient";

const SocketHandler = (req, res) => {
    if (!res.socket.server.io) {
        const io = new Server(res.socket.server);
        res.socket.server.io = io;

        

        io.on("connection", (socket) => {
            console.log("Client connected");

            startSeedLinkClient((waveformData) => {
                io.emit('waveformData', waveformData);
            });

            // setInterval(() => {
            //     io.emit('waveformData', "testing");
            // }, 1000);
            
        });

      
    } else {
        console.log("TEST");
    }
    res.end();
};

export default SocketHandler;
