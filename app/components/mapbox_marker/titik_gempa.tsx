import mapboxgl from "mapbox-gl";
import AnimatedPopup from 'mapbox-gl-animated-popup';
import { createRoot } from 'react-dom/client';
import { GiCancel } from 'react-icons/gi';
import Card from "../card/card";

type TitikGempaSetting = {
    coordinates: number[],
    mag?: number,
    depth?: number,
    map?: mapboxgl.Map,
    sWaveSpeed?: number,
    pWaveSpeed?: number,
    description?: string;

}

export default class TitikGempa {
    id: string;
    setting?: TitikGempaSetting;

    pWaveRadius: number = 0;
    sWaveRadius: number = 0;
    curTime: number = 0;
    _play: boolean = true;
    gempaMarker: mapboxgl.Marker | null = null;
    finishWave : boolean = false;
    constructor(id: string, setting?: TitikGempaSetting) {
        this.id = id;
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
        return this.setting?.coordinates;
    }

    get mag() {
        return this.setting?.mag;
    }

    get depth() {
        return this.setting?.depth;
    }

    init() {
        if (this.setting != null && this.setting.pWaveSpeed != null && this.setting.sWaveSpeed != null) {
           
            if (this.setting.map != null) {
                
                this.renderMarker();
                setTimeout(() => {
                    this.animateWave();
                    this.renderPopup();
                }, 1000);

                setTimeout(() => {
                    this.removeAllRender();
                },(Math.abs(this.mag || 1) * 10000))
            }
        }
    }

    renderMarker() {
        const titikGempa = document.createElement('div');
        //  el.id = 'marker';
        titikGempa.classList.add('marker-gempa');
        titikGempa.classList.add('blink');
        const rootMarker = createRoot(titikGempa)
        rootMarker.render(<GiCancel />);

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
            {this.setting?.description}
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
            }).setDOMContent(placeholder).setLngLat(this.setting?.coordinates!);
            this.gempaMarker.setPopup(popup);
            popup.addTo(this.setting!.map);
            setTimeout(() => {
                popup.remove();
            },3000);
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
                        coordinates: this.setting?.coordinates // Koordinat pusat circle
                    },
                    properties: {
                        id: 'p-wave',
                        radius: this.pWaveRadius,
                        lat: parseFloat(this.setting?.coordinates[1].toString()),
                        color: 'orange',
                        titikGempa: this.center
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: this.setting?.coordinates // Koordinat pusat circle
                    },
                    properties: {
                        id: 's-wave',
                        radius: this.sWaveRadius,
                        lat: parseFloat(this.setting?.coordinates[1].toString()),
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
        
        const animate = (time: number) => {
            if (!this.curTime) this.curTime = time;


            const deltaTime = time - this.curTime;
            if (this.setting != null && this._play) {
                this.pWaveRadius = ((deltaTime / 1000) * this.setting.pWaveSpeed!);
                this.sWaveRadius = ((deltaTime / 1000) * this.setting.sWaveSpeed!);
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



    play() {
        this._play = true;
    }

    pause() {
        this._play = false;
    }

    removeAllRender() {
        if (this.setting?.map != null) {
            if(this.setting.map.getLayer(this.id)){
                this.setting.map.removeLayer(this.id);
            }
            
            if(this.setting.map.getSource('wave-source-' + this.id)){
                this.setting.map.removeSource('wave-source-' + this.id);
            }
            this.finishWave = true;
        }
    }
}