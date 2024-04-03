
import { Server } from 'socket.io'

const SocketHandler = (req:any, res:any) => {
    if (res.socket.server.io) {
      console.log('Socket is already running')
    } else {
      console.log('Socket is initializing')
      const io = new Server(res.socket.server)
      res.socket.server.io = io
      io.on("connection", (socket) => {
        const clientId = socket.id;
        console.log("A client connected");
        console.log(`A client connected. ID: ${clientId}`);
        io.emit("client-new", clientId);
    
        // Event handler for receiving messages from the client
        socket.on("message", (data) => {
          console.log("Received message:", data);
        });
    
        // Event handler for client disconnections
        socket.on("disconnect", () => {
          console.log("A client disconnected.");
        });
      });
    }
    res.end()
  }
  
export default SocketHandler
