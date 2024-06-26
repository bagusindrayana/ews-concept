
import { Server } from 'socket.io'

const SocketHandler = (req:any, res:any) => {
    if (res.socket.server.io) {
      console.log('Socket is already running')
    } else {
      console.log('Socket is initializing')
      const io = new Server(res.socket.server)
      res.socket.server.io = io
     
    }
    res.socket.server.io.emit('message', 'Hello, everyone!');
    
    res.json({ message: 'Message sent' })
  }
  
export default SocketHandler