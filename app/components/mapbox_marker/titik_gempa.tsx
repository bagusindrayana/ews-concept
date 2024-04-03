import mapboxgl from "mapbox-gl";
import AnimatedPopup from 'mapbox-gl-animated-popup';
import { createRoot } from 'react-dom/client';
import { GiCancel } from 'react-icons/gi';

type TitikGempaSetting = {
    coordinates: number[],
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

    constructor(id: string, setting?: TitikGempaSetting) {
        this.id = id;
        this.setting = setting;

        this.init();
    }

    get center() {
        return this.setting?.coordinates;
    }

    init() {
        if (this.setting != null && this.setting.pWaveSpeed != null && this.setting.sWaveSpeed != null) {
            this.animateWave();
            if(this.setting.map != null){
                this.renderMarker();
            }
        }
    }

    renderMarker(){
        const titikGempa = document.createElement('div');
        //  el.id = 'marker';
        titikGempa.classList.add('marker-gempa');
        titikGempa.classList.add('blink');
        const rootMarker = createRoot(titikGempa)
        rootMarker.render(<GiCancel />);

        // create the marker
        const gempaMarker = new mapboxgl.Marker(titikGempa)
        .setLngLat([this.center![0], this.center![1]])
        .addTo(this.setting?.map!);
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
                        id:'p-wave',
                        radius: this.pWaveRadius,
                        lat: this.setting?.coordinates[1],
                        color: 'orange'
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: this.setting?.coordinates // Koordinat pusat circle
                    },
                    properties: {
                        id:'s-wave',
                        radius: this.sWaveRadius,
                        lat: this.setting?.coordinates[1],
                        color: 'red'
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

        if (!this.setting.map.getLayer(this.id)) {
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
                this.pWaveRadius = 0 + ((deltaTime / 1000) * this.setting.pWaveSpeed!);
                this.sWaveRadius = 0 + ((deltaTime / 1000) * this.setting.sWaveSpeed!);
            }


            this.renderWave();
            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
    }



    play() {
        this._play = true;
    }

    pause() {
        this._play = false;
    }
}