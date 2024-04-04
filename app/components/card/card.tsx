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
    return (<div className={'card red-bordered '+className}>
        <div className="card-header red-bordered-bottom">
            {title}
        </div>
        <div className="card-content p-2">
            {children}
        </div>
        {footer && <div className="card-footer red-bordered-top">
            {footer}
        </div>}
    </div>)
}