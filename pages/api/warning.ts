
import { Server } from 'socket.io'

const SocketHandler = (req:any, res:any) => {
    if (res.socket.server.io) {
      console.log('Socket is already running')
    } else {
      console.log('Socket is initializing')
      const io = new Server(res.socket.server)
      res.socket.server.io = io
    }
    //get message query
    const { lat,lng,message,id } = req.query
    //emit message
    res.socket.server.io.emit('warning', {
        id: id,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        message: message
    })
    res.json({ message: 'Message sent' })
  }
  
export default SocketHandler