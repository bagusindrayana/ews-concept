'use client'
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from "mapbox-gl";
import './ui.css';
import React, { useRef, useEffect, useState } from 'react';
// import WarningAlert from './components/warning_alert/warning_alert';
// import WaveMarker from './components/mapbox_marker/wave_marker';
import Card from './components/card/card';
import AnimatedPopup from 'mapbox-gl-animated-popup';
import { createRoot } from 'react-dom/client';
import io from 'socket.io-client'
import { GiCancel } from 'react-icons/gi';
import WaveCircle from './components/mapbox_marker/wave_circle';
// import * as turf from '@turf/turf'
import Worker from 'web-worker';
import TitikGempa from './components/mapbox_marker/titik_gempa';


mapboxgl.accessToken = 'pk.eyJ1IjoiYmFndXNpbmRyYXlhbmEiLCJhIjoiY2p0dHMxN2ZhMWV5bjRlbnNwdGY4MHFuNSJ9.0j5UAU7dprNjZrouWnoJyg';


export default function Home() {
  const mapContainer = useRef<HTMLDivElement | null>(null); // Update the type of mapContainer ref
  const map = useRef<mapboxgl.Map | null>(null); // Update the type of the map ref
  const [lng, setLng] = useState(116.1153781);
  const [lat, setLat] = useState(0.146658);
  const [zoom, setZoom] = useState(5);
  const [warning, setWarning] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [waveCircles, setWaveCircles] = useState<WaveCircle[]>([]);
  const [earthQuackAlerts, setEarthQuackAlerts] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);

  const geoJsonData = useRef<any>(null);
  const worker = useRef<Worker | null>(null);
  let hoveredPolygonId = null;

  const [titikGempas, setTtitkGempas] = useState<TitikGempa[]>([]);

  const loadGeoJsonData = (data: any) => {
    map.current!.on('load', () => {
      map.current!.addSource('wilayah', {
        type: 'geojson',
        generateId: true,
        data: data
      });

      map.current!.loadImage(
        '/danger-svgrepo-com.png', (err, image: any) => {
          // Throw an error if something goes wrong.
          if (err) throw err;

          // Add the image to the map style.
          map.current!.addImage('danger-icon', image);

        });

      map.current!.loadImage(
        '/hexagons.png', (err, image: any) => {
          // Throw an error if something goes wrong.
          if (err) throw err;

          // Add the image to the map style.
          map.current!.addImage('hexagons', image);

        });

      map.current!.addLayer({
        'id': 'wilayah',
        'type': 'fill',
        'source': 'wilayah', // reference the data source
        'layout': {},
        'paint': {
          'fill-color': 'gray', // blue color fill
          // 'fill-opacity': 0.5,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1,
            0.5
          ]

        }
      });

      map.current!.addLayer({
        'id': 'outline',
        'type': 'line',
        'source': 'wilayah',
        'layout': {},
        'paint': {
          'line-color': '#807a72',
          'line-width': 1
        }
      });

      map.current!.on('mousemove', 'wilayah', (e: any) => {
        if (e.features.length > 0) {
          if (hoveredPolygonId !== null) {
            map.current!.setFeatureState(
              { source: 'wilayah', id: hoveredPolygonId },
              { hover: false }
            );
          }
          hoveredPolygonId = e.features[0].id;
          if (hoveredPolygonId !== null) {
            map.current!.setFeatureState(
              { source: 'wilayah', id: hoveredPolygonId },
              { hover: true }
            );
          }
        }
      });

      // When the mouse leaves the state-fill layer, update the feature state of the
      // previously hovered feature.
      map.current!.on('mouseleave', 'wilayah', () => {
        if (hoveredPolygonId !== null) {
          map.current!.setFeatureState(
            { source: 'wilayah', id: hoveredPolygonId },
            { hover: false }
          );
        }
        hoveredPolygonId = null;
      });



      // const coordinate = [106.3128055, -7.2676271];
      // const radius = 500000; // Example radius in kilometers
      // var buffer = turf.buffer(turf.point(coordinate), radius, { units: 'meters' });
      // let highlightArea = [];
      // for (let index = 0; index < data.features.length; index++) {
      //   const feature = data.features[index];
      //   if (feature.geometry.type == 'Polygon') {
      //     var intersection = turf.intersect(turf.polygon(feature.geometry.coordinates), buffer);
      //     if (intersection) {
      //       // console.log(intersection);
      //       highlightArea.push(intersection);
      //     }
      //   } else if (feature.geometry.type == 'MultiPolygon') {
      //     var intersection = turf.intersect(turf.multiPolygon(feature.geometry.coordinates), buffer);
      //     if (intersection) {
      //       // console.log(intersection);
      //       highlightArea.push(intersection);
      //     }
      //   }


      // }
      // map.current!.addSource('highlight-source', {
      //   'type': 'geojson',
      //   'data': { "type": "FeatureCollection", "features": highlightArea }
      // });

      // map.current!.addLayer({
      //   'id': 'highlight-layer',
      //   'type': 'fill',
      //   'source': 'highlight-source', // reference the data source
      //   'layout': {},
      //   'paint': {
      //     'fill-color': '#f00',
      //     'fill-opacity': 0.5
      //   }
      // });


    });

  }

  const getGeoJsonData = () => {
    fetch('/all_kabkota_ind.geojson')
      .then(response => response.json())
      .then(data => {
        geoJsonData.current = data;
        loadGeoJsonData(data);
        //   const myWorker = new Worker("service-worker.js", { type: "module" });
        //   setInterval(() => {
        //     myWorker.postMessage(geoJsonData);
        // }, 1000);

        // const worker = new Worker(
        //   new URL('./worker.mjs', import.meta.url),
        //   { type: 'module' }
        // );

        //   setInterval(() => {
        //     worker.postMessage(geoJsonData.current);
        // }, 1000);

        worker.current = new Worker(
          new URL('./worker.mjs', import.meta.url),
          { type: 'module' }
        );

        worker.current.postMessage({ type: 'geoJsonData', data: geoJsonData.current });

      }).catch(error => console.error('Error fetching data:', error));
  };

  const renderWaveGempa = () => {
    
  }

  const warningHandler = async (data: any) => {
    const time = new Date().toLocaleTimeString();
    setWarning(true);
    await new Promise(r => setTimeout(r, 6000));
    // setWarning(false);
    const allPopUp = document.querySelectorAll('.warning .show-pop-up');
    allPopUp.forEach((v) => {
      v.classList.add('close-pop-up');
    });
    if (map.current == null) return;

    //wait 1 second
    await new Promise(r => setTimeout(r, 500));
    setEvents([...events, data.message]);
    map.current.flyTo({
      center: [data.lng, data.lat],
      zoom: 7,
      essential: true
    });
    // create DOM element for the marker
    const titikGempa = document.createElement('div');
    //  el.id = 'marker';
    titikGempa.classList.add('marker-gempa');
    titikGempa.classList.add('blink');
    const rootMarker = createRoot(titikGempa)
    rootMarker.render(<GiCancel />);

    // create the marker
    const gempaMarker = new mapboxgl.Marker(titikGempa)
      .setLngLat([data.lng, data.lat])
      .addTo(map.current)


    // const newWaves = [
    //   new WaveCircle('p-wave-' + time, 6000, map.current, [data.lng, data.lat], {
    //     color: '#744a00',
    //     geoJson: geoJsonData.current,
    //     selectedAreaSetting: {
    //       color: '#ffaa13',
    //       opacity: 1
    //     },
    //     selectedPointSetting: {},
    //     worker: worker.current
    //   }),
    //   new WaveCircle('s-wave-' + time, 2000, map.current, [data.lng, data.lat], {
    //     color: 'red',
    //     geoJson: geoJsonData.current,
    //     // intersectAreaSetting: {
    //     //   color: '#ff1f00',
    //     //   opacity: 1
    //     // },
    //     selectedAreaSetting: {
    //       color: '#ff1f00',
    //       opacity: 1
    //     },
    //     worker: worker.current
    //   })
    // ];

    // setWaveCircles([...waveCircles, ...newWaves]);
    const ntg = new TitikGempa("titik-gempa-" + time, {
      coordinates: [data.lng, data.lat],
      depth: 10,
      map: map.current,
      sWaveSpeed: 2000,
      pWaveSpeed: 6000,
      description: data.message
    });

    setTtitkGempas([...titikGempas, ntg]);




    await new Promise(r => setTimeout(r, 1000));
    setWarning(false);
    allPopUp.forEach((v) => {
      v.classList.remove('close-pop-up');
    });

    const placeholder = document.createElement('div');
    const root = createRoot(placeholder)
    root.render(<Card title={
      <div className='overflow-hidden'>
        <div className='strip-wrapper'><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
        <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
          <p className='p-1 bg-black font-bold text-2xl'>GEMPA BUMI</p>
        </div>
      </div>
    } className='min-h-48 min-w-48'>
      {data.message}
    </Card>)
    // create the popup
    // const popup = new mapboxgl.Popup({ closeOnClick: false }).setDOMContent(placeholder).setLngLat([data.lng, data.lat]));

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
    }).setDOMContent(placeholder).setLngLat([data.lng, data.lat]);
    gempaMarker.setPopup(popup);
    popup.addTo(map.current);




    await new Promise(r => setTimeout(r, 4000));
    popup.remove();

    setEarthQuackAlerts([...earthQuackAlerts, data.message]);
  }

  const socketInitializer = () => {
    if (socket != null) return;
    fetch('/api/socket')
      .then(() => {
        let s = io();
        s.on('connect', () => {
          console.log('connected');
        });
        s.on('warning', (v: any) => {
          warningHandler(v);
        });
        setSocket(s);
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });
  };


  useEffect(() => {

    if (map.current) return; // initialize map only once


    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: zoom,
      maxZoom: 22,
    });

    getGeoJsonData();
    socketInitializer();
  }, [socket, waveCircles, earthQuackAlerts, events,]);



  // useEffect(() => {
  //   if ('serviceWorker' in navigator) {
  //     navigator.serviceWorker
  //       .register('/service-worker.js')
  //       .then((registration) => console.log('scope is: ', registration.scope));
  //   }
  // }, []);


  return (
    <div>

      <div ref={mapContainer} className="w-full h-screen" />
      {/* {warning && <WarningAlert message='WARNING' subMessage={"SHAKE DETECTED"} color="red" closeTime={1000} />} */}
      {/* <div className={'warning-wrapper'}>

        <div className='flex justify-evenly w-full'>
          <div className="long-shape">
            <div className="shape bg">
              <div className="hex">
                <svg width="115" height="100" viewBox="0 0 115 100" fill={'#e60003'} xmlns="http://www.w3.org/2000/svg">
                  <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
                </svg>
              </div>
              <div className="hex">
                <svg width="115" height="100" viewBox="0 0 115 100" fill={'#e60003'} xmlns="http://www.w3.org/2000/svg">
                  <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
                </svg>
              </div>
            </div>
            <div className="shape br">
              <div className="hex">
                <svg width="115" height="100" viewBox="0 0 115 100" fill={'black'} xmlns="http://www.w3.org/2000/svg">
                  <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
                </svg>
              </div>
              <div className="hex">
                <svg width="115" height="100" viewBox="0 0 115 100" fill={'black'} xmlns="http://www.w3.org/2000/svg">
                  <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
                </svg>
              </div>
            </div>
            <div className="shape fg">
              <div className="hex">
                <svg width="115" height="100" viewBox="0 0 115 100" fill={'#e60003'} xmlns="http://www.w3.org/2000/svg">
                  <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
                </svg>
              </div>
              <div className="hex">
                <svg width="115" height="100" viewBox="0 0 115 100" fill={'#e60003'} xmlns="http://www.w3.org/2000/svg">
                  <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
                </svg>
              </div>
            </div>
          </div>
        </div>


        <div className="flex justify-evenly w-full mt-28">
          <div className="basic-shape mr-44">
            <div className="hex">
              <svg width="115" height="100" viewBox="0 0 115 100" fill={'#e60003'} xmlns="http://www.w3.org/2000/svg">
                <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
              </svg>
            </div>
            <div className="hex">
              <svg width="115" height="100" viewBox="0 0 115 100" fill={'black'} xmlns="http://www.w3.org/2000/svg">
                <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
              </svg>
            </div>
            <div className="hex">
              <svg width="115" height="100" viewBox="0 0 115 100" fill={'#e60003'} xmlns="http://www.w3.org/2000/svg">
                <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
              </svg>
            </div>
            <div className="hex">
              <svg width="115" height="100" viewBox="0 0 115 100" fill={'black'} xmlns="http://www.w3.org/2000/svg">
                <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
              </svg>
            </div>
          </div>

          <div className="basic-shape ml-44">
            <div className="hex">
              <svg width="115" height="100" viewBox="0 0 115 100" fill={'#e60003'} xmlns="http://www.w3.org/2000/svg">
                <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
              </svg>
            </div>
            <div className="hex">
              <svg width="115" height="100" viewBox="0 0 115 100" fill={'black'} xmlns="http://www.w3.org/2000/svg">
                <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
              </svg>
            </div>
            <div className="hex">
              <svg width="115" height="100" viewBox="0 0 115 100" fill={'#e60003'} xmlns="http://www.w3.org/2000/svg">
                <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
              </svg>
            </div>
            <div className="hex">
              <svg width="115" height="100" viewBox="0 0 115 100" fill={'black'} xmlns="http://www.w3.org/2000/svg">
                <path d="M28.7204 100L0 50L28.7204 2.16244e-06H86.1557L114.876 50L86.1557 100H28.7204Z" />
              </svg>
            </div>
          </div>
        </div>

      </div> */}

      {warning &&
        <div className='absolute m-auto top-0 bottom-0 left-0 right-0 flex flex-col justify-center items-center overlay-bg'>
          <div className='warning scale-100 md:scale-150 flex flex-col justify-center items-center '>
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
              <div className="basic-hex -mt-12 -mr-2 opacity-0 show-pop-up flex flex-col justify-center items-center">
                <p className='text-xl'>7</p>
                <p className='text-xs'>Magnitudo</p>
              </div>
              <div className="basic-hex opacity-0 show-pop-up"></div>
              <div className="basic-hex -mt-12 -ml-2 opacity-0 show-pop-up flex flex-col justify-center items-center">
                <p className='text-xl'>10KM</p>
                <p className='text-xs'>Kedalaman</p>
              </div>
            </div>
            <div className="w-full flex justify-between show-pop-up">
              <div className="warning-yellow -mt-28 ml-6 opacity-0 blink animation-delay-2"></div>
              <div className="warning-yellow -mt-28 mr-6 opacity-0 blink animation-delay-2"></div>
            </div>
          </div></div>}

      <div className="grid grid-cols-3 grid-flow-col gap-4 w-1/2 fixed left-6 top-6">

        {earthQuackAlerts.map((v, i) => {
          return <div key={i}><Card title={
            <div className='overflow-hidden'>
              <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
              <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                <p className='p-1 bg-black font-bold text-2xl'>GEMPA BUMI</p>
              </div>
            </div>
          } className='show-pop-up'>
            {v}
          </Card></div>
        })}
      </div>
      <Card title={
        <p className='font-bold' style={{
          color: "red"
        }}>EVENT LOG</p>
      } className='min-h-24 min-w-60 fixed right-6 top-6'>
        <ul>
          {events.map((v, i) => {
            return <li key={i}>{v}</li>
          })}


        </ul>
      </Card>



      {/* <div className='fixed top-0 bottom-0 left-0 right-0 red-border p-1'></div> */}
      {/* <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center align-middle'>
        <div className='red-border bg-black  m-auto block pt-1 w-1/2 md:w-1/4 text-center z-40 red-color show-pop-up glow-effect'>
          <div className='overflow-hidden '>
            <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
            
          </div>
          <div className="text-3xl font-bold my-4 vertical-reveal">WARNING</div>
          <div className='overflow-hidden'>
          <div className='strip-wrapper '><div className='strip-bar loop-strip anim-duration-20'></div><div className='strip-bar loop-strip anim-duration-20'></div></div>
          </div>
        </div>

      </div> */}
      {/* <div className='strip top-0'>
        <div className='strip-wrapper'><div className='strip-bar loop-strip-reverse'></div><div className='strip-bar loop-strip-reverse'></div>
        </div>
      </div>
      <div className='strip bottom-0'>
        <div className='strip-wrapper'><div className='strip-bar loop-strip'></div><div className='strip-bar loop-strip'></div>
        </div>
      </div> */}
    </div>

  );
}
