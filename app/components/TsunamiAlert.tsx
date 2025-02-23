import Card from './card/card';
export default function TsunamiAlert({alertTsunami}:{alertTsunami:any}) {
    function generateDiv(max) {
        let arrayDivs: any = [];
        for (let index = 0; index < max; index++) {
          arrayDivs.push(<div key={index} style={{
            animationDelay: `${index * 0.002}s`
          }}>
            <img src="/images/warning_hex_red.png" alt="" />
          </div>);
        }
    
        return arrayDivs;
      }
    
    return (<div className='fixed m-auto top-0 left-0 right-0 bottom-0 flex justify-center' id="tsunami-warning">

        <div className='w-full h-full absolute -rotate-90'>
          <div className="main " id='bg-tsunami'>
            <div className="hex-bg">
              {generateDiv(window.screen.width + (window.screen.width / 3))}

            </div>
          </div>
        </div>

        <div className='w-full flex flex-col items-center justify-center '>
          <div className='warning scale-75 md:scale-150 flex flex-col justify-center items-center'>
            <div className='long-hex flex flex-col justify-center opacity-0 show-pop-up animation-delay-1'>
              <div className="flex justify-evenly w-full items-center">
                <div className='warning-black opacity-0 blink animation-fast animation-delay-2'></div>
                <div className='flex flex-col font-bold text-center text-black'>
                  <span className='text-xl'>TSUNAMI</span>
                  <span className='text-xs'>Peringatan Dini Tsunami</span>
                </div>
                <div className='warning-black opacity-0 blink animation-fast animation-delay-2'></div>
              </div>
            </div>
            <div className=' w-3/4 overflow-hidden bg-black relative rounded flex justify-center items-center opacity-0 show-pop-up animation-delay-2'>

              <div className='absolute w-full h-2 m-auto top-0 left-0 right-0 overflow-hidden'>
                <div className='w-2 h-full strip-bar-red strip-animation'></div>
              </div>
              <div className='absolute w-full h-2 m-auto bottom-0 left-0 right-0 overflow-hidden'>
                <div className='w-2 h-full strip-bar-red strip-animation-reverse'></div>
              </div>
              <div className='absolute w-2 h-full m-auto top-0 bottom-0 left-0 overflow-hidden'>
                <div className='w-2 h-full strip-bar-red-vertical strip-animation-vertical-reverse'></div>

              </div>

              <div className='absolute w-2 h-full m-auto top-0 bottom-0 right-0 overflow-hidden'>
                <div className='w-2 h-full strip-bar-red-vertical strip-animation-vertical'></div>

              </div>
              <div className='w-full h-full p-6'>
                <div className="red-bordered p-2 text-center w-full mb-2">
                  <div className='overflow-hidden relative'>
                    <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
                    <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                      <p className='p-1 bg-black font-bold text-xs text-glow'>POTENSI TSUNAMI</p>
                    </div>
                  </div>
                </div>
                <Card title={
                  <div className='overflow-hidden relative'>
                    <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
                    <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                      <p className='p-1 bg-black font-bold text-xs text-glow uppercase'>{alertTsunami.infoTsunami.level}</p>
                    </div>
                  </div>
                }
                  className='w-full h-auto'>
                  <p className='text-xs'>
                    {alertTsunami.infoTsunami.message}
                  </p>
                </Card>
              </div>

            </div>
          </div>



        </div>
        <div className='absolute top-0 bottom-0 left-0 right-0 '>
          <div className='z-20 absolute top-8 left-8 md:top-28 md:left-28 scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up animation-delay-2'>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow"></div>
              </div>
            </div>
          </div>

          <div className='z-20 absolute bottom-8 left-8 md:bottom-28 md:left-28 scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up' style={{
              animationDelay: "2.5s"
            }}>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow"></div>
              </div>
            </div>
          </div>

          <div className='z-20 absolute top-8 right-8 md:top-28 md:right-28 scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up' style={{
              animationDelay: "3s"
            }}>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow"></div>
              </div>
            </div>
          </div>


          <div className='z-20 absolute bottom-8 right-8 md:bottom-28 md:right-28 scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up' style={{
              animationDelay: "3.5s"
            }}>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow"></div>
              </div>
            </div>
          </div>

          <div className='z-20 absolute h-28 m-auto bottom-0 top-0 right-16 md:right-1/4 hidden md:block scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up' style={{
              animationDelay: "2s"
            }}>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow"></div>
              </div>
            </div>
          </div>

          <div className='z-20 absolute h-28 m-auto bottom-0 top-0 left-16 md:left-1/4 hidden md:block scale-150'>
            <div className='p-1 bg-black rounded-xl opacity-0 show-pop-up del' style={{
              animationDelay: "2.5s"
            }}>
              <div className='p-1 red-bordered'>
                <div className="warning-tsunami-yellow "></div>
              </div>
            </div>
          </div>



        </div>



      </div>);
}