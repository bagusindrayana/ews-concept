import mapboxgl from "mapbox-gl";
import AnimatedPopup from 'mapbox-gl-animated-popup';
import { createRoot } from 'react-dom/client';
import { GiCancel } from 'react-icons/gi';
import Card from "../card/card";
import { InfoTsunami } from "@/libs/interface";

type TitikTsunamiSetting = {
    map: mapboxgl.Map,
    showMarker?: boolean,
    showPopup?: boolean,
    zoomToPosition?: boolean,
    sWaveSpeed?: number,
    pWaveSpeed?: number,
    description?: string;
    showPopUpInSecond?: number;
    closePopUpInSecond?: number;

}

export default class TitikTsunami {
    id: string;
    infoTsunami: InfoTsunami;
    setting?: TitikTsunamiSetting;
    tsunamiMarker: mapboxgl.Marker | null = null;

    constructor(id: string, infoTsunami: InfoTsunami, setting?: TitikTsunamiSetting) {
        this.id = id;
        this.infoTsunami = infoTsunami;
        this.setting = setting;

        this.init();
    }

    init() {
        if (this.setting != null) {


            if (this.setting.map != null) {


                if (this.setting.showMarker) {
                    this.renderMarker();
                }

                if (this.setting.zoomToPosition) {
                    this.flyTo();
                }


                if (this.setting.showPopup) {
                    if (this.setting.showPopUpInSecond) {
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

    get center() {
        return [this.infoTsunami.lng, this.infoTsunami.lat];
    }

    renderMarker() {
        const titikTsunami = document.createElement('div');
        //  el.id = 'marker';
        titikTsunami.classList.add('marker-tsunami');
        // titikTsunami.classList.add('blink');
        const rootMarker = createRoot(titikTsunami)
        rootMarker.render(
            <div className="circles flex justify-center items-center">
                <div className="circle1"></div>
                <div className="circle2"></div>
                <div className="circle3"></div>
                <GiCancel className="blink" />
            </div>);

        // create the marker
        this.tsunamiMarker = new mapboxgl.Marker(titikTsunami)
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
                    <p className='p-1 bg-black font-bold text-xs text-glow'>PERINGATAN TSUNAMI</p>
                </div>
            </div>
        } className='min-h-48 min-w-64 whitespace-pre-wrap' >
            <p className="mt-1">
                {this.setting?.description}
            </p>
        </Card>)

        if (this.tsunamiMarker) {
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
                },
            }).setDOMContent(placeholder).setLngLat(this.center).setMaxWidth('256px').addClassName('min-w-64');
            this.tsunamiMarker.setPopup(popup);
            popup.addTo(this.setting!.map);

            if (this.setting!.closePopUpInSecond) {
                setTimeout(() => {
                    popup.remove();
                }, this.setting!.closePopUpInSecond * 1000);
            }

        }
    }

    flyTo() {
        if (this.setting?.map != null) {
            this.setting.map.flyTo({
                center: [this.infoTsunami.lng, this.infoTsunami.lat],
                zoom: 6
            });
        }
    }

}