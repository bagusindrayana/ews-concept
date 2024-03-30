import './styles.css'
import React from 'react'
export default function WarningAlert({ message, color,colorText, className,subMessage,closeTime } : { message: string, color?: string, colorText?: string,className?:string,subMessage?:string,closeTime?:number }) {
    const _customColor = color ?? "#fc7216";
    const _customColorText = colorText ?? "black";
    const _customClassName = className ?? "";
    const [show, setShow] = React.useState(true);
    React.useEffect(() => {
        if(closeTime != null){
            setTimeout(() => {
                setShow(false);
            }, closeTime);
        }
    }, [show]);
    return (
        <div className={'warning-wrapper '+_customClassName+(!show?' close':'')} style={{
            background:_customColor
        }}>
            
            <div className="warning-shape">
                <div className="hex">
                    <svg width="115" height="100" viewBox="0 0 115 100" fill={_customColor} xmlns="http://www.w3.org/2000/svg">
                        <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
                    </svg>
                </div>
                <div className="hex">
                    <svg width="115" height="100" viewBox="0 0 115 100" fill={_customColor} xmlns="http://www.w3.org/2000/svg">
                        <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
                    </svg>
                </div>
            </div>
            <div className='absolute flex flex-col justify-center items-center text-center w-full m-auto bottom-0 top-0 font-bold ' style={{
                    color:_customColorText
                }}>
                <p className='text-2xl'>{message}</p>
                
                {subMessage != null?(subMessage):(<></>)}
            </div>
        </div>
    )
}