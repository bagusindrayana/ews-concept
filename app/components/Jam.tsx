import { useEffect, useState } from "react";
const { DateTime } = require("luxon");

export default function Jam({timeZone}: {timeZone?: string}) {
    
   
    const calculateClock = () => {
        let dt = DateTime.now();
        if(dt){
            dt = dt.setZone(timeZone);
        }
        return dt.toFormat('HH:mm:ss');
    }

    const [readableTime, setReadableTime] = useState(calculateClock());


    useEffect(() => {

    
       
        const interval = setInterval(() => {
            setReadableTime(calculateClock());

        }, 1000);

        return () => clearInterval(interval);
    });
    return (
        <>
{readableTime}
        </>

    )
}