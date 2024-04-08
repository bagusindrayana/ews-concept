import { useState } from "react"

export default function Card({
    children,
    title,
    footer,
    className,
    borderColor
}: Readonly<{
    children: React.ReactNode,
    title?: React.ReactNode,
    footer?: React.ReactNode,
    className?: string
    borderColor?: string
}>) {
    const [open, setOpen] = useState(false)
    return (<div className={'card red-bordered '+className+" "+(open?"open":"")}>
        {title && <div className="card-header red-bordered-bottom" onClick={()=>{

            setOpen(!open)
        }}>
            {title}
        </div>}
        <div className="card-content p-2 custom-scrollbar">
            {children}
        </div>
        {footer && <div className="card-footer red-bordered-top">
            {footer}
        </div>}
    </div>)
}