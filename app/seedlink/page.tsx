'use client';
import { useEffect, useState } from "react";
import io from "socket.io-client";
let socket;

export default function HomePage() {
  const [waveformData, setWaveformData] = useState([]);

  const socketInitializer = async () => {
    socket = io()

    socket.on('connect', () => {
      console.log('connected')
    });

    socket.on("waveformData", (data) => {
      console.log(data);
      setWaveformData((prevData) => [...prevData, data]);
    });

    socket.on("message", (data) => {
      console.log("message");
    });
   
  }

  useEffect(() => {
    socketInitializer();
  }, []);

  return (
    <div>
      <h1>Waveform Data</h1>
      <div>
        {waveformData.map((data, index) => (
          <p key={index}>{data}</p>
        ))}
      </div>
    </div>
  );
}