'use client'
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from "mapbox-gl";
import './ui.css';
import React, { useRef, useEffect, useState } from 'react';
import WarningAlert from './components/warning_alert/warning_alert';
// import WaveMarker from './components/mapbox_marker/wave_marker';
import Card from './components/card/card';
import AnimatedPopup from 'mapbox-gl-animated-popup';
import { createRoot } from 'react-dom/client';
import io from 'socket.io-client'
import { GiCancel } from 'react-icons/gi';
import WaveCircle from './components/mapbox_marker/wave_circle';
// import * as turf from '@turf/turf'
import Worker from 'web-worker';


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


  const loadGeoJsonData = (data: any) => {
    map.current!.on('load', () => {
      map.current!.addSource('wilayah', {
        type: 'geojson',
        data: data
      });

      map.current!.loadImage(
        '/danger-svgrepo-com.png', (err, image:any) => {
          // Throw an error if something goes wrong.
          if (err) throw err;

          // Add the image to the map style.
          map.current!.addImage('danger-icon', image);

        });

      map.current!.addLayer({
        'id': 'wilayah',
        'type': 'fill',
        'source': 'wilayah', // reference the data source
        'layout': {},
        'paint': {
          'fill-color': 'transparent', // blue color fill
          'fill-opacity': 0.5,
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
    fetch('/geoBoundaries-IDN-ADM2_simplified.geojson')
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

      }).catch(error => console.error('Error fetching data:', error));
  };

  const warningHandler = async (data: any) => {
    const time = new Date().toLocaleTimeString();
    setWarning(true);
    if (map.current == null) return;

    //wait 1 second
    await new Promise(r => setTimeout(r, 1000));
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

    setEvents([...events, data.message]);
    const newWaves = [
      new WaveCircle('p-wave-' + time, 6000, map.current, [data.lng, data.lat], {
        color: '#744a00',
        geoJson: geoJsonData.current,
        selectedAreaSetting: {
          color: '#ffaa13',
          opacity: 1
        },
        selectedPointSetting:{},
        worker: worker.current
      }),
      new WaveCircle('s-wave-' + time, 2000, map.current, [data.lng, data.lat], {
        color: 'red',
        geoJson: geoJsonData.current,
        intersectAreaSetting: {
          color: '#ff1f00',
          opacity: 1
        },
        worker: worker.current
      })
    ];

    setWaveCircles([...waveCircles, ...newWaves]);




    await new Promise(r => setTimeout(r, 1000));

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


    await new Promise(r => setTimeout(r, 1000));
    setWarning(false);

    await new Promise(r => setTimeout(r, 3000));
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
  }, [socket, waveCircles, earthQuackAlerts]);



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
      {warning && <WarningAlert message='PERINGATAN' subMessage={"GETARAN TERDETEKSI"} color="red" closeTime={1000} />}
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
