'use client'
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from "mapbox-gl";
import './ui.css';
import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client'
import Worker from 'web-worker';
import TitikGempa from './components/mapbox_marker/titik_gempa';
import GempaBumiAlert from './components/GempaBumiAlert';
import * as turf from '@turf/turf'
import Card from './components/card/card';
import { createRoot } from 'react-dom/client';
import AnimatedPopup from 'mapbox-gl-animated-popup';


mapboxgl.accessToken = 'pk.eyJ1IjoiYmFndXNpbmRyYXlhbmEiLCJhIjoiY2p0dHMxN2ZhMWV5bjRlbnNwdGY4MHFuNSJ9.0j5UAU7dprNjZrouWnoJyg';

interface InfoGempa {
  lng: number;
  lat: number;
  mag: number;
  depth: string;
  place?: string;
  time?: string;
  message?: string;
}
let socket;
export default function Home() {
  const mapContainer = useRef<HTMLDivElement | null>(null); // Update the type of mapContainer ref
  const map = useRef<mapboxgl.Map | null>(null); // Update the type of the map ref
  const [lng, setLng] = useState(116.1153781);
  const [lat, setLat] = useState(0.146658);
  const [zoom, setZoom] = useState(5);

  const geoJsonData = useRef<any>(null);
  const worker = useRef<Worker | null>(null);


  const adaGempa = useRef<boolean>(false);
  // const [titikGempas, setTitikGempas] = useState<TitikGempa[]>([]);

  const tgs = useRef<TitikGempa[]>([]);
  const [alertGempaBumis, setAlertGempaBumis] = useState<InfoGempa[]>([]);
  const [infoGempas, setInfoGempas] = useState<InfoGempa[]>([]);
  const [stackAlerts, setStackAlerts] = useState<InfoGempa[]>([]);
  const [detailInfoGempa, setDetailInfoGempa] = useState<InfoGempa | null>(null);

  const igs = useRef<InfoGempa[]>([]);
  const markerDaerahs = useRef<any[]>([]);

  const lastGempaId = useRef<string>('');


  const warningHandler = async (data: any) => {

    await new Promise(r => setTimeout(r, 6000));
    const time = new Date().toLocaleTimeString();
    if (!map.current) return;
    map.current.flyTo({
      center: [data.lng, data.lat],
      zoom: 7,
      essential: true
    });
    const id = `tg-${time}`;
    const tg = new TitikGempa(id, {
      coordinates: [data.lng, data.lat],
      pWaveSpeed: 6000,
      sWaveSpeed: 3000,
      map: map.current!,
      description: data.message
    });

    tgs.current.push(tg);

    if (worker.current != null) {
      adaGempa.current = true;
      sendWave();
    }

    await new Promise(r => setTimeout(r, 4000));
    setStackAlerts([...stackAlerts, data]);
  }

  const socketInitializer = () => {
    if (socket != null) return;
    fetch('/api/socket')
      .then(() => {
        console.log('Socket is initializing');
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });
  };

  const initWorker = () => {
    worker.current = new Worker(
      new URL('./worker.mjs', import.meta.url),
      { type: 'module' }
    );

    worker.current.postMessage({ type: 'geoJsonData', data: geoJsonData.current });

    worker.current.addEventListener('message', (event: any) => {
      const data = event.data;
      // if (data.type == "checkMultiHighlightArea" && data.id == "s-wave") {
      //   recieveSWave(data);
      // }

      // if (data.type == "checkMultiHighlightArea" && data.id == "p-wave") {
      //   recievePWave(data);
      // }

      if (data.type == "checkMultiHighlightArea" && data.id == "wave") {
        recieveWave(data);
      }
    });
  }

  const loadGeoJsonData = () => {
    fetch('/all_kabkota_ind.geojson')
      .then(response => response.json())
      .then(data => {
        geoJsonData.current = data;
        map.current!.on('load', () => {
          map.current!.addSource('wilayah', {
            type: 'geojson',
            generateId: true,
            data: data
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
        });


        initWorker();

      }).catch(error => console.error('Error fetching data:', error));
  };


  useEffect(() => {
    socketInitializer();

    socket = io();

    socket.on('connect', () => {
      console.log('connected');
    });
    socket.on('warning', (v: any) => {
      const nig: InfoGempa = {
        lng: parseFloat(v.lng),
        lat: parseFloat(v.lat),
        mag: v.mage || 9.0,
        depth: v.depth || "10 Km",
        message: v.message,
        place: v.place,
        time: new Date().toLocaleString()
      };

      setAlertGempaBumis([...alertGempaBumis, nig]);
      //add data to first infoGempas
      setInfoGempas([nig, ...infoGempas]);
      warningHandler(v);
    });

    if (map.current) return () => {
      socket!.disconnect();
    };
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: zoom,
      maxZoom: 22,
    });

    loadGeoJsonData();
    getTitikGempaJson();
    getGempa();
    return () => {
      socket!.disconnect();
    }


  }, [alertGempaBumis, infoGempas, stackAlerts]);



  const sendWave = () => {
    const pWaves = tgs.current.map((v: TitikGempa) => {
      return {
        center: v.center,
        radius: v.pWaveRadius
      }
    });
    const sWaves = tgs.current.map((v: TitikGempa) => {
      return {
        center: v.center,
        radius: v.sWaveRadius
      }
    });
    worker.current!.postMessage({ type: 'checkMultiHighlightArea', pWaves: pWaves, sWaves: sWaves, id: "wave" });
  }


  const isEqual = (a, b) => a.id === b.id && a.name === b.name;


  const recieveWave = (data: any) => {
    const areas = data.area;

    // Hapus data array objek yang sama
    const uniqueData = areas.filter((obj, index, self) =>
      index === self.findIndex((t) => isEqual(t.properties, obj.properties))
    );

    for (let x = 0; x < uniqueData.length; x++) {
      const element = uniqueData[x];
      const p: number[] = turf.centroid(element).geometry.coordinates;
      if (markerDaerahs.current.findIndex((el) => el[0] == p[0] && el[1] == p[1]) == -1) {
        markerDaerahs.current.push([p[0], p[1]]);
        const markerParent = document.createElement('div');
        const markerEl = document.createElement('div');
        markerEl.innerHTML = '<p class="uppercase">' + element.properties.alt_name + '</p>';
        markerEl.classList.add('marker-daerah');
        markerEl.classList.add('show-pop-up');
        markerParent.appendChild(markerEl);
        new mapboxgl.Marker(markerParent)
          .setLngLat([p[0], p[1]])
          .addTo(map.current!)
      }


    }

    if (map.current!.getSource('hightlight-wave')) {
      (map.current!.getSource('hightlight-wave') as mapboxgl.GeoJSONSource).setData({ "type": "FeatureCollection", "features": uniqueData });
    } else {
      map.current!.addSource('hightlight-wave', {
        'type': 'geojson',
        'data': { "type": "FeatureCollection", "features": uniqueData }
      });
    }

    if (!map.current!.getLayer('hightlight-wave-layer')) {
      map.current!.addLayer({
        'id': 'hightlight-wave-layer',
        'type': 'fill',
        'source': 'hightlight-wave',
        'layout': {},
        'paint': {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.8
        }
      });

      map.current!.moveLayer('outline');
      for (let tg of tgs.current) {
        map.current!.moveLayer(tg.id);
      }
    }

    sendWave();
  }

  function getTitikGempaJson() {
    const url = "https://bmkg-content-inatews.storage.googleapis.com/gempaQL.json";
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        map.current!.on('load', () => {
          let ifg: InfoGempa[] = [];
          for (let index = 0; index < data.features.length; index++) {
            const feature = data.features[index];
            ifg.push({
              lng: feature.geometry.coordinates[0],
              lat: feature.geometry.coordinates[1],
              mag: feature.properties.mag,
              depth: feature.properties.depth,
              place: feature.properties.place,
              time: feature.properties.time
            });
          }
          igs.current = ifg;
          setInfoGempas(ifg);

          //check earthquakes layer
          if (map.current!.getLayer('earthquakes-layer')) {
            //update source
            (map.current!.getSource('earthquakes') as mapboxgl.GeoJSONSource).setData(url);
          } else {
            //add source
            map.current!.addSource('earthquakes', {
              type: 'geojson',
              data: data
            });

            map.current!.addLayer({
              'id': 'earthquakes-layer',
              'type': 'circle',
              'source': 'earthquakes',
              'paint': {
                'circle-radius': ["to-number", ['get', 'mag']],
                'circle-stroke-width': 2,

                'circle-color': [
                  "case",
                  //depth <= 50 red, depth <= 100 orange, depth <= 250 yellow, depth <= 600 green, depth > 600 blue
                  ['<=', ["to-number", ['get', 'depth']], 50],
                  "red",
                  ['<=', ["to-number", ['get', 'depth']], 100],
                  "orange",
                  ['<=', ["to-number", ['get', 'depth']], 250],
                  "yellow",
                  ['<=', ["to-number", ['get', 'depth']], 600],
                  "green",
                  "blue",
                ],
                'circle-stroke-color': 'white'
              }
            });
          }

          map.current!.on('click', 'earthquakes-layer', (e: any) => {
            // Copy coordinates array.
            const coordinates = e.features[0].geometry.coordinates.slice();
            const d = e.features[0].properties;
            const placeholder = document.createElement('div');
            const root = createRoot(placeholder)
            root.render(<Card title={
              <div className='overflow-hidden'>
                <div className='strip-wrapper'><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
                <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                  <p className='p-1 bg-black font-bold text-2xl text-glow'>GEMPA BUMI</p>
                </div>
              </div>
            } className='min-h-48 min-w-48 whitespace-pre-wrap' >
              <ul>
                <li>
                  Magnitudo : {d.mag}
                </li>
                <li>
                  Kedalaman : {d.depth}
                </li>
                <li>
                  Waktu : {new Date(d.time!).toLocaleString()}
                </li>
                <li>
                  Lokasi (Lat,Lng) : <br />{coordinates[0]} , {coordinates[1]}
                </li>
              </ul>
            </Card>);

            new AnimatedPopup({
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
            }).setDOMContent(placeholder).setLngLat(coordinates).addTo(map.current!);
          });

          map.current!.on('mouseenter', 'earthquakes-layer', () => {
            map.current!.getCanvas().style.cursor = 'pointer';
          });

          // Change it back to a pointer when it leaves.
          map.current!.on('mouseleave', 'earthquakes-layer', () => {
            map.current!.getCanvas().style.cursor = '';
          });

        });
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });

  }

  function getGempa() {
    const url = "https://bmkg-content-inatews.storage.googleapis.com/datagempa.json"
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        console.log(data);
        lastGempaId.current = data.identifier;
        getGempaPeriodik();
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });
  }

  function getGempaPeriodik() {
    setInterval(() => {
      const url = "https://bmkg-content-inatews.storage.googleapis.com/datagempa.json"
      //await fetch
      fetch(url)
        .then(response => response.json())
        .then((data) => {
          if (lastGempaId.current != data.identifier) {
            lastGempaId.current = data.identifier;
            const coordinates = data.info.point.coordinates.split(",");

            const nig: InfoGempa = {
              lng: parseFloat(coordinates[0]),
              lat: parseFloat(coordinates[1]),
              mag: parseFloat(data.info.magnitude),
              depth: data.info.depth,
              message: data.info.description + "\n" + data.info.instruction,
              place: data.info.place,
              time: new Date().toLocaleString()
            };

            igs.current.unshift(nig);

            setAlertGempaBumis([...alertGempaBumis, nig]);
            //add data to first infoGempas
            setInfoGempas(igs.current);
            warningHandler({
              lng: parseFloat(coordinates[0]),
              lat: parseFloat(coordinates[1]),
              mag: parseFloat(data.info.magnitude),
              depth: data.info.depth,
              message: data.info.description + "\n" + data.info.instruction
            });

          }
        })
        .catch((error) => {
          console.error('Error initializing socket:', error);
        });
    }, 5000);

    // setInterval(()=>{
    //   const url = "https://bmkg-content-inatews.storage.googleapis.com/lastQL.json";
    // });
  }

  const selectedPopup = useRef<any>(null);
  function selectEvent(d: InfoGempa) {
    setDetailInfoGempa(d);
    if (selectedPopup.current) {
      selectedPopup.current.remove();
    }
    map.current!.flyTo({
      center: [d.lng, d.lat],
      zoom: 7,
      essential: true
    });
    const placeholder = document.createElement('div');
    const root = createRoot(placeholder)
    root.render(<Card title={
      <div className='overflow-hidden'>
        <div className='strip-wrapper'><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
        <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
          <p className='p-1 bg-black font-bold text-2xl text-glow'>GEMPA BUMI</p>
        </div>
      </div>
    } className='min-h-48 min-w-48 whitespace-pre-wrap ' >
      <ul >
        <li>
          Magnitudo : {d.mag}
        </li>
        <li>
          Kedalaman : {d.depth}
        </li>
        <li>
          Waktu : {new Date(d.time!).toLocaleString()}
        </li>
        <li>
          Lokasi (Lat,Lng) : <br />{d.lat} , {d.lng}
        </li>
      </ul>
    </Card>);

    selectedPopup.current = new AnimatedPopup({
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
    }).setDOMContent(placeholder).setLngLat([d.lng, d.lat]).addTo(map.current!);
  }



  return (
    <div>

      <div ref={mapContainer} className="w-full h-screen" />
      {/* <GempaBumiAlert
           
            props={
              {
                magnitudo: 9.0,
                kedalaman: '10 km',
                show: true,
              }
            } /> */}
      <div className="grid grid-cols-3 grid-flow-col gap-4 w-1/2 fixed left-6 top-6">
        {stackAlerts.map((v, i) => {
          return <div key={i}><Card title={
            <div className='overflow-hidden'>
              <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
              <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
                <p className='p-1 bg-black font-bold text-2xl text-glow'>GEMPA BUMI</p>
              </div>
            </div>
          } className='show-pop-up'>
            <p className='whitespace-pre-wrap'>{v.message}</p>
          </Card></div>
        })}
      </div>
      {alertGempaBumis.map((v, i) => {
        return <div key={i}>
          <GempaBumiAlert
            key={i}
            props={
              {
                magnitudo: v.mag || 9.0,
                kedalaman: v.depth || '0 km',
                show: true,
                closeInSecond: 5
              }
            } />
        </div>
      })}

      <Card title={
        <p className='font-bold text-glow-red' style={{
          color: "red"
        }}>EVENT LOG</p>
      } footer={
        <p className='font-bold text-glow-red'>

        </p>
      } className=' fixed right-6 top-6 card-float w-1/2 md:w-1/4'>
        <ul >
          {infoGempas.map((v: InfoGempa, i) => {
            let readAbleTime = v.time;
            //convert 2024-04-03 05:45:04.621973 to d/m/Y H:i:s
            if (v.time) {
              const date = new Date(v.time);
              readAbleTime = date.toLocaleString('id-ID');
            }



            return <li key={i}
              onClick={() => {
                selectEvent(v);

              }}
              className='flex flex-col mb-2 list-event cursor-pointer'>
              <span className='text-sm'>{readAbleTime}</span>
              <div className=' bordered p-2'>
                {Number(v.mag).toFixed(2)} M - {v.place || "uknown"}
              </div>
            </li>
          })}
        </ul>

      </Card>

      {detailInfoGempa && <Card title={
        <div className='w-full flex justify-between'>
          <p className='font-bold text-glow-red'>
            DETAIL EVENT
          </p>
          <button onClick={() => {
            if (selectedPopup.current) {
              selectedPopup.current.remove();
            }
            setDetailInfoGempa(null);
          }}>X</button>
        </div>
      }
        footer={
          <p className='font-bold text-glow-red'>

          </p>
        }
        className='show-pop-up fixed right-6 bottom-6  card-float w-1/2 md:w-1/4'>
        <ul >
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              TIME : {detailInfoGempa.time}
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              MAGNITUDE : {Number(detailInfoGempa.mag).toFixed(2)} M
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              DEPTH : {Number(detailInfoGempa.depth).toFixed(2)} KM
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              PLACE : {detailInfoGempa.place}
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              LATITUDE : {detailInfoGempa.lat}
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2'>
              LONGITUDE : {detailInfoGempa.lng}
            </div>
          </li>


        </ul>
      </Card>}


    </div>

  );
}
