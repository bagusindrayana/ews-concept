import mapboxgl from "mapbox-gl";
import AnimatedPopup from 'mapbox-gl-animated-popup';
import { createRoot } from 'react-dom/client';
import { GiCancel } from 'react-icons/gi';
import Card from "../card/card";
import { InfoGempa } from "@/libs/interface";

type TitikGempaSetting = {
    map: mapboxgl.Map,
    showMarker?: boolean,
    showPopup?: boolean,
    zoomToPosition?: boolean,
    sWaveSpeed?: number,
    pWaveSpeed?: number,
    description?: string;
    showPopUpInSecond?:number;
    closePopUpInSecond?:number;

}

export default class TitikGempa {
    id: string;
    infoGempa: InfoGempa;
    setting?: TitikGempaSetting;

    pWaveRadius: number = 0;
    sWaveRadius: number = 0;
    curTime: number = 0;
    _play: boolean = true;
    gempaMarker: mapboxgl.Marker | null = null;
    finishWave: boolean = false;
    initalPWaveRadius: number = 0;
    initalSWaveRadius: number = 0;
    constructor(id: string,infoGempa: InfoGempa, setting?: TitikGempaSetting) {
        this.id = id;
        this.infoGempa = infoGempa;
        this.setting = setting;

        this.init();
    }

    get description() {
        return this.setting?.description;
    }

    get finish() {
        return this.finishWave;
    }

    get center() {
        return [this.infoGempa.lng, this.infoGempa.lat];
    }

    get mag() {
        return this.infoGempa.mag;
    }

    get depth() {
        return this.infoGempa.depth;
    }

    get time(){
        return this.infoGempa.time;
    }
    
    get timeDiff() {
        if(this.infoGempa.time != null){
            const d = new Date(this.infoGempa.time);
            const now = new Date();
            return new Date(now.getTime() - d.getTime()).toLocaleTimeString();
        }
        return "-";
    }

    get readableMag() {
        if(this.mag != null){
            return parseFloat(this.mag.toString()).toFixed(1);
        }
        return 0;
    }

    get readableDepth() {
        if(this.infoGempa.depth){
            return parseFloat(this.infoGempa.depth.replace(" Km", "")).toFixed(2);
        }
        return 0;
    }

    get readableTime() {
        if(this.infoGempa.time != null){
            return new Date(this.infoGempa.time).toLocaleString();
        }
        return "-"
    }

    init() {
        if (this.setting != null ) {
            

            if (this.setting.map != null) {
                if(this.infoGempa.time != null && this.setting.pWaveSpeed != null && this.setting.sWaveSpeed != null){
                    const d = new Date(this.infoGempa.time);
                    const now = new Date();
                    const diff = now.getTime() - d.getTime();
                    //initial radius
                    this.initalPWaveRadius = (diff / 1000) * this.setting.pWaveSpeed;
                    this.initalSWaveRadius = (diff / 1000) * this.setting.sWaveSpeed;
                    setTimeout(() => {
                        this.removeAllRender();
                    }, ((Math.abs(this.mag || 1) * 20000) - diff));

                    setTimeout(() => {
                    
                        this.animateWave();
                        
                    }, 1000);
                }
                
                if(this.setting.showMarker){
                    this.renderMarker();
                }

                if(this.setting.zoomToPosition){
                    this.flyTo();
                }
                

                if(this.setting.showPopup){
                    if(this.setting.showPopUpInSecond){
                        setTimeout(() => {
                            this.renderPopup();
                            
                        }, this.setting.showPopUpInSecond * 1000);
                    } else {
                        setTimeout(() => {
                            this.renderPopup();
                            
                        }, 1000);
                    }
                }

                
            }
        }
    }

    renderMarker() {
        const titikGempa = document.createElement('div');
        //  el.id = 'marker';
        titikGempa.classList.add('marker-gempa');
        // titikGempa.classList.add('blink');
        const rootMarker = createRoot(titikGempa)
        rootMarker.render(
            <div className="circles flex justify-center items-center">
            <div className="circle1"></div>
            <div className="circle2"></div>
            <div className="circle3"></div>
            <GiCancel className="blink"/>
        </div>);

        // create the marker
        this.gempaMarker = new mapboxgl.Marker(titikGempa)
            .setLngLat([this.center![0], this.center![1]])
            .addTo(this.setting?.map!);


    }

    renderPopup() {
        const placeholder = document.createElement('div');
        const root = createRoot(placeholder)
        root.render(<Card title={
            <div className='overflow-hidden'>
                <div className='strip-wrapper'><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
                <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                    <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
                </div>
            </div>
        } className='min-h-48 min-w-48 whitespace-pre-wrap' >
            {this.mag && <div className='text-glow text-sm w-full bordered p-1' style={{
                fontSize: "10px"
              }}>
                <table className='w-full'>
                  <tbody>
                    <tr>
                      <td className='flex'>Time</td>
                      <td className='text-right break-words pl-2'>{this.infoGempa.time}</td>
                    </tr>
                    <tr>
                      <td className='flex'>Magnitudo</td>
                      <td className='text-right break-words pl-2'>{this.mag}</td>
                    </tr>
                    <tr>
                      <td className='flex'>Kedalaman</td>
                      <td className='text-right break-words pl-2'>{this.depth}</td>
                    </tr>
                  </tbody>
                </table>
              </div>}
            <p className="mt-1">
            {this.setting?.description}
            </p>
        </Card>)

        if (this.gempaMarker) {
            const popup = new AnimatedPopup({
                closeOnClick: false,
                openingAnimation: {
                    duration: 100,
                    easing: 'easeOutSine',
                    transform: 'scale'
                },
                closingAnimation: {
                    duration: 100,
                    easing: 'easeInOutSine',
                    transform: 'scale'
                }
            }).setDOMContent(placeholder).setLngLat(this.center);
            this.gempaMarker.setPopup(popup);
            popup.addTo(this.setting!.map);
            setTimeout(() => {
                popup.remove();
            }, 3000);
        }
    }

    renderWave() {
        if (this.setting?.map == null) return;

        const circles: any = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: this.center // Koordinat pusat circle
                    },
                    properties: {
                        id: 'p-wave',
                        radius: this.pWaveRadius,
                        lat: parseFloat(this.center[1].toString()),
                        color: 'orange',
                        titikGempa: this.center
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: this.center // Koordinat pusat circle
                    },
                    properties: {
                        id: 's-wave',
                        radius: this.sWaveRadius,
                        lat: parseFloat(this.center[1].toString()),
                        color: 'red',
                        titikGempa: this.center
                    }
                }

            ]
        };

        if (!this.setting.map?.getSource('wave-source-' + this.id)) {
            this.setting.map.addSource('wave-source-' + this.id, {
                type: 'geojson',
                data: circles
            });
        } else {
            (this.setting.map?.getSource('wave-source-' + this.id) as mapboxgl.GeoJSONSource).setData(circles);
        }

        if (!this.setting.map.getLayer(this.id) && this.finishWave == false) {
            this.setting.map.addLayer({
                id: this.id,
                type: 'circle',
                source: 'wave-source-' + this.id,
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['exponential', 2],
                        ['zoom'],
                        0, 0,
                        22, [
                            '/',
                            ['/', ['get', 'radius'], 0.019],
                            ['cos', ['*', ['get', 'lat'], ['/', Math.PI, 180]]],
                        ],
                    ],
                    'circle-color': 'transparent',
                    'circle-stroke-color': ['get', 'color'],
                    'circle-stroke-width': 2,
                }
            });
            this.setting.map.moveLayer(this.id);
        }


    }

    animateWave() {
        if(this.setting != null && this.infoGempa.time != null){
            const d = new Date(this.infoGempa.time);
            const now = new Date();
            const diff = now.getTime() - d.getTime();
            //initial radius
            this.initalPWaveRadius = (diff / 1000) * this.setting.pWaveSpeed!;
            this.initalSWaveRadius = (diff / 1000) * this.setting.sWaveSpeed!;
        }
        const animate = (time: number) => {
            if (!this.curTime) this.curTime = time;


            const deltaTime = time - this.curTime;
            if (this.setting != null && this._play) {
                this.pWaveRadius = this.initalPWaveRadius + ((deltaTime / 1000) * this.setting.pWaveSpeed!);
                this.sWaveRadius = this.initalSWaveRadius + ((deltaTime / 1000) * this.setting.sWaveSpeed!);
            }


            this.renderWave();
            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
        // setInterval(() => {
        //     if (this.setting != null && this._play) {
        //         this.pWaveRadius += this.setting.pWaveSpeed!;
        //         this.sWaveRadius += this.setting.sWaveSpeed!;
        //     }

        //     this.renderWave();
        // }, 1000);
    }

    flyTo() {
        if (this.setting?.map != null) {
            this.setting.map.flyTo({
                center:[this.infoGempa.lng, this.infoGempa.lat],
                zoom: 6
            });
        }
    }



    play() {
        this._play = true;
    }

    pause() {
        this._play = false;
    }

    removeAllRender() {
        if (this.setting?.map != null) {
            if (this.setting.map.getLayer(this.id)) {
                this.setting.map.removeLayer(this.id);
            }

            if (this.setting.map.getSource('wave-source-' + this.id)) {
                this.setting.map.removeSource('wave-source-' + this.id);
            }
            if (this.setting.map!.getLayer('hightlight-wave-layer')) {
                this.setting.map!.removeLayer('hightlight-wave-layer');
                this.setting.map!.removeSource('hightlight-wave');
                const markers = document.querySelectorAll('.marker-daerah');
                //get parent and remove
                markers.forEach((v) => {
                  v.parentElement!.remove();
                });
              }
            this.finishWave = true;
        }
    }

    removeMarker() {
        if (this.gempaMarker) {
            this.gempaMarker.remove();
        }
    }
}