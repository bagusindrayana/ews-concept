import { useState, useEffect } from 'react';

interface GempaBumiAlertProps {
    magnitudo?: number;
    kedalaman?: string;
    show?: boolean;
    closeInSecond?: number;
}

export default function GempaBumiAlert({ props }: { props: GempaBumiAlertProps }) {
    const notifSound = "/sounds/system-notification-199277.mp3"
    const warningSound = "/sounds/error-call-to-attention-129258.mp3"

    const [close, setClose] = useState(false);
    useEffect(() => {
        const allPopUp = document.querySelectorAll('.warning .show-pop-up');
        if (!props.show) {

            allPopUp.forEach((v) => {
                v.classList.add('close-pop-up');
            });

            setTimeout(() => {
                console.log('close');
                setClose(true);
            }, 1000);
        } else {
            allPopUp.forEach((v) => {
                v.classList.remove('close-pop-up');
            });


        }
        var notif = new Audio(notifSound);
        notif.play();

        setTimeout(() => {
            var warning = new Audio(warningSound);
            warning.play();
        }, 1000);

        // setTimeout(() => {
        //     const audioDangerElement = document.getElementById('danger');
        //     if(audioDangerElement){
        //         (audioDangerElement as HTMLAudioElement).play();
        //     }
        // },2000);
    }, [props.show]);

    useEffect(() => {
        const allPopUp = document.querySelectorAll('.warning .show-pop-up');
        if (props.closeInSecond) {
            setTimeout(() => {
                allPopUp.forEach((v) => {
                    v.classList.add('close-pop-up');
                });
                setTimeout(() => {
                    setClose(true);
                }, 1000);
            }, props.closeInSecond * 1000);
        }
    }, [props.closeInSecond]);

    return (!close && <div className='absolute m-auto top-0 bottom-0 left-0 right-0 flex flex-col justify-center items-center '>

        <div className='fixed m-auto top-0 bottom-0 left-0 right-0 flex flex-col justify-center items-center overlay-bg'></div>
        <div className='warning scale-75 md:scale-150 flex flex-col justify-center items-center '>
            <div className='long-hex flex flex-col justify-center opacity-0 show-pop-up animation-delay-1'>
                <div className="flex justify-evenly w-full items-center">
                    <div className='warning-black opacity-0 blink animation-fast animation-delay-2'></div>
                    <div className='flex flex-col font-bold text-center text-black'>
                        <span className='text-xl'>PERINGATAN</span>
                        <span className='text-xs'>Gempa Bumi Terdeteksi</span>
                    </div>
                    <div className='warning-black opacity-0 blink animation-fast animation-delay-2'></div>
                </div>
            </div>
            <div className="w-full flex justify-between">
                <div className="warning-black-hex -mt-20 show-pop-up"></div>
                <div className="warning-black-hex -mt-20 show-pop-up"></div>
            </div>
            <div className="w-full flex justify-center info">
                <div className="basic-hex -mt-12 -mr-2 opacity-0 show-pop-up flex flex-col justify-center items-center text-glow">
                    <p className='text-xl'>{props.magnitudo}</p>
                    <p style={{
                        fontSize: '10px',
                    }}>MAGNITUDO</p>
                </div>
                <div className="basic-hex opacity-0 show-pop-up"></div>
                <div className="basic-hex -mt-12 -ml-2 opacity-0 show-pop-up flex flex-col justify-center items-center text-glow">
                    <p className='text-xl'>{props.kedalaman}</p>
                    <p style={{
                        fontSize: '10px',
                    }}>KEDALAMAN</p>
                </div>
            </div>
            <div className="w-full flex justify-between show-pop-up">
                <div className="warning-yellow -mt-24 ml-6 opacity-0 blink animation-delay-2"></div>
                <div className="warning-yellow -mt-24 mr-6 opacity-0 blink animation-delay-2"></div>
            </div>
        </div>
        <div className='strip top-0'>
            <div className='strip-wrapper'><div className='strip-bar loop-strip-reverse'></div><div className='strip-bar loop-strip-reverse'></div>
            </div>
        </div>
        <div className='strip bottom-0'>
            <div className='strip-wrapper'><div className='strip-bar loop-strip'></div><div className='strip-bar loop-strip'></div>
            </div>
        </div>
    </div>);
}