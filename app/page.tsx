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
import ItemKotaTerdampak from './components/ItemKotaTerdampak';
import { KotaTerdampak, InfoGempa } from "../libs/interface";
const { DateTime } = require("luxon");


mapboxgl.accessToken = 'pk.eyJ1IjoiYmFndXNpbmRyYXlhbmEiLCJhIjoiY2p0dHMxN2ZhMWV5bjRlbnNwdGY4MHFuNSJ9.0j5UAU7dprNjZrouWnoJyg';



let socket;
export default function Home() {
  const dangerSound = "/sounds/siren-alarm-96503.mp3"
  const smallEarthQuakeSound = "/sounds/wrong-answer-129254.mp3"
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
  const [stackAlert, setStackAlert] = useState<InfoGempa | null>(null);
  const sas = useRef<InfoGempa[]>([]);
  const [detailInfoGempa, setDetailInfoGempa] = useState<InfoGempa | null>(null);

  const [kotaTerdampak, setKotaTerdampak] = useState<KotaTerdampak[]>([]);
  const kts = useRef<KotaTerdampak[]>([]);

  const igs = useRef<InfoGempa[]>([]);
  const markerDaerahs = useRef<any[]>([]);

  const lastGempaId = useRef<string>('');
  const lastGempaKecilId = useRef<string>('');

  const titikGempaKecil = useRef<TitikGempa | null>(null);
  const [infoGempaTerakhir, setInfoGempaTerakhir] = useState<InfoGempa | null>(null);
  const [infoGempaDirasakanTerakhir, setInfoGempaDirasakanTerakhir] = useState<InfoGempa | null>(null);


  const warningHandler = async (data: any) => {
    const time = new Date().toLocaleTimeString();
    const id = data.id ?? `tg-${time}`;
    const nig: InfoGempa = {
      id: id,
      lng: parseFloat(data.lng),
      lat: parseFloat(data.lat),
      mag: data.mag || 9.0,
      depth: data.depth || "10 Km",
      message: data.message,
      place: data.place,
      time: new Date().toLocaleString()
    };

    igs.current.unshift(nig);
    const audioDangerElement = document.getElementById('danger');
    setTimeout(() => {

      if (audioDangerElement) {
        (audioDangerElement as HTMLAudioElement).play();
      }
    }, 2000);

    setAlertGempaBumis([...alertGempaBumis, nig]);
    //add data to first infoGempas
    setInfoGempas([nig, ...infoGempas]);
    await new Promise(r => setTimeout(r, 6000));
    if (audioDangerElement) {
      //set volume down
      (audioDangerElement as HTMLAudioElement).volume = 0.5;
    }

    if (!map.current) return;
    map.current.flyTo({
      center: [data.lng, data.lat],
      zoom: 7,
      essential: true
    });

    const tg = new TitikGempa(id, {
      coordinates: [data.lng, data.lat],
      pWaveSpeed: 6000,
      sWaveSpeed: 3000,
      map: map.current!,
      description: data.message,
      mag: data.mag || 9.0,
      depth: data.depth || "10 Km",
    });

    tgs.current.push(tg);

    if (worker.current != null) {
      adaGempa.current = true;
      sendWave();
    }

    await new Promise(r => setTimeout(r, 4000));
    //setStackAlerts([...stackAlerts, data]);
  }

  const socketInitializer = () => {
    if (socket != null) return;
    fetch('/api/socket')
      .then(() => {

        console.log('Socket is initializing');

        socket = io();

        socket.on('connect', () => {
          console.log('connected');
        });
        socket.on('warning', (v: any) => {

          warningHandler(v);
        });

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
    fetch('/geojson/all_kabkota_ind.geojson')
      .then(response => response.json())
      .then(data => {
        geoJsonData.current = data;
        map.current!.on('load', () => {
          if (!map.current!.getSource('wilayah')) {
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
          }
        });
        getGempa();
        getGempaKecil();
        getTitikGempaJson();
        initWorker();

      }).catch((error) => {
        alert("Failed load geojson data : " + error);
        console.error('Error fetching data:', error);
      });
  };


  useEffect(() => {



    socketInitializer();



    if (map.current && socket) return () => {
      socket!.disconnect();
    };

    // (document.getElementById("error") as HTMLAudioElement).volume = 0.5;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: zoom,
      maxZoom: 22,
    });

    loadGeoJsonData();

    if (socket) return () => {
      socket!.disconnect();
    };


  }, [alertGempaBumis, infoGempas, stackAlert]);



  const sendWave = () => {

    let t: any = [];
    for (let i = 0; i < tgs.current.length; i++) {
      const v = tgs.current[i];
      if (!v.finish) {
        t.push({
          id: v.id,
          center: v.center,
          mag: v.mag,
          depth: v.depth,
          pWaveRadius: v.pWaveRadius,
          sWaveRadius: v.sWaveRadius,
          areaTerdampak: [],
          message: v.description
        })
      }

    }
    if (t.length > 0) {
      worker.current!.postMessage({ type: 'checkMultiHighlightArea', titikGempa: t, id: "wave" });
    }
  }


  const isEqual = (a, b) => a.id === b.id && a.name === b.name;


  const recieveWave = async (data: any) => {
    let alerts: InfoGempa[] = [];
    for (let x = 0; x < data.titikGempa.length; x++) {
      const tg = data.titikGempa[x];

      const nig: InfoGempa = {
        id: tg.id,
        lng: parseFloat(tg.center[1]),
        lat: parseFloat(tg.center[0]),
        mag: tg.mag,
        depth: tg.depth,
        message: tg.message,
        place: tg.place,
        time: new Date().toLocaleString(),
        listKotaTerdampak: []
      };

      for (let il = 0; il < tg.areaTerdampak.length; il++) {
        const at = tg.areaTerdampak[il];
        const dist = turf.distance(turf.point([tg.center[0], tg.center[1]]), turf.point([at.center[0], at.center[1]])) - (tg.sWaveRadius / 1000);
        const time = Math.floor(dist / 3) * 1000;
        nig.listKotaTerdampak!.push({
          lng: at.center[1],
          lat: at.center[0],
          distance: dist,
          name: at.alt_name,
          hit: at.hit,
          timeArrival: new Date(new Date().getTime() + time)
        });

      }

      //sort nig.listKotaTerdampak by distance
      nig.listKotaTerdampak!.sort((a, b) => a.distance - b.distance);

      alerts.push(nig);
    }

    //get last alert
    if (alerts.length > 0) {
      setStackAlert(alerts.slice(-1).pop()!);
    } else {
      setStackAlert(null);
    }

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

      } else {

        const index = kts.current.findIndex((el) => el.lng == p[0] && el.lat == p[1]);
        if (index != -1) {

          // kts.current[index].distance += 16;
          // kts.current[index].hit = element.properties.hit;
          // setKotaTerdampak([...kotaTerdampak, ...kts.current]);
          // countdownTime();
        }
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
        if (map.current!.getLayer(tg.id)) {
          map.current!.moveLayer(tg.id);
        }
      }
    }

    sendWave();
  }

  function getTitikGempaJson() {
    const url = "https://bmkg-content-inatews.storage.googleapis.com/gempaQL.json?t=" + new Date().getTime();
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        document.getElementById("loading-screen")!.style.display = "none";
        let ifg: InfoGempa[] = [];
        for (let index = 0; index < data.features.length; index++) {
          const feature = data.features[index];
          ifg.push({
            id: feature.properties.id,
            lng: feature.geometry.coordinates[0],
            lat: feature.geometry.coordinates[1],
            mag: feature.properties.mag,
            depth: feature.properties.depth,
            place: feature.properties.place,
            time: feature.properties.time
          });
        }
        igs.current = ifg;
        setInfoGempas(igs.current);
        map.current!.on('load', () => {
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
                  <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
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
    const url = "https://bmkg-content-inatews.storage.googleapis.com/datagempa.json?t=" + new Date().getTime();
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        const coordinates = data.info.point.coordinates.split(",");
        lastGempaId.current = data.identifier;
        const sentTime = DateTime.fromISO(data.sent.replace("WIB", ""), { zone: "Asia/Jakarta" });
        const currentTime = DateTime.now().setZone("Asia/Jakarta");

        const nig: InfoGempa = {
          id: data.identifier,
          lng: parseFloat(coordinates[0]),
          lat: parseFloat(coordinates[1]),
          mag: data.info.magnitude || 9.0,
          depth: data.info.depth || "10 Km",
          message: data.info.description,
          time: sentTime.toLocaleString()
        };


        //if sent time is less than 5 minutes
        if ((currentTime.toMillis() - sentTime.toMillis()) < 600000) {

          warningHandler({
            id: data.identifier,
            lng: parseFloat(coordinates[0]),
            lat: parseFloat(coordinates[1]),
            mag: parseFloat(data.info.magnitude),
            depth: data.info.depth,
            message: data.info.description + "\n" + data.info.instruction,
            time: sentTime.toLocaleString(),
          });
          setTimeout(() => {
            setInfoGempaDirasakanTerakhir(nig);
          }, 6000);
        } else {
          setInfoGempaDirasakanTerakhir(nig);
        }

        // getGempaPeriodik();
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });


  }

  function getGempaKecil() {
    const url = "https://bmkg-content-inatews.storage.googleapis.com/lastQL.json?t=" + new Date().getTime();
    fetch(url)
      .then(response => response.json())
      .then((data) => {
        if (data.features.length > 0) {
          const feature = data.features[0];
          lastGempaKecilId.current = feature.properties.id;

          const sentTime = DateTime.fromSQL(feature.properties.time, { zone: 'UTC' });
          const currentTime = DateTime.now().setZone("UTC");

          const msg = `${feature.properties.place}
Magnitudo : ${feature.properties.mag}
Kedalaman : ${feature.properties.depth}
Lokasi (Lat,Lng) : 
${feature.geometry.coordinates[0]} , ${feature.geometry.coordinates[1]}`
          const nig: InfoGempa = {
            id: feature.properties.id,
            lng: parseFloat(feature.geometry.coordinates[1]),
            lat: parseFloat(feature.geometry.coordinates[0]),
            mag: parseFloat(feature.properties.mag) || 9.0,
            depth: feature.properties.depth || "10 Km",
            message: msg,
            place: feature.properties.place,
            time: feature.properties.time
          };
          setInfoGempaTerakhir(nig);
          const cek = igs.current.find((v) => v.id == feature.properties.id);
          if (!cek) {
            igs.current.push(nig);
          }



          //if sent time is less than 10 minutes
          if ((currentTime.toMillis() - sentTime.toMillis()) < 600000) {

            if (map.current) {
              var notif = new Audio(smallEarthQuakeSound);
              notif.play();
              map.current!.flyTo({
                center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
                zoom: 7,
                essential: true
              });

              const tg = new TitikGempa(feature.properties.id, {
                coordinates: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
                pWaveSpeed: 6000,
                sWaveSpeed: 3000,
                map: map.current!,
                description: msg,
                mag: parseFloat(feature.properties.mag) || 9.0,
                depth: feature.properties.depth || "10 Km",
              });



              if (titikGempaKecil.current) {
                titikGempaKecil.current.removeAllRender();
              }
              titikGempaKecil.current = tg;
            }


          }

        }
        getGempaPeriodik();
      })
      .catch((error) => {
        console.error('Error initializing socket:', error);
      });
  }

  function getGempaPeriodik() {
    setInterval(() => {
      const url = "https://bmkg-content-inatews.storage.googleapis.com/datagempa.json?t=" + new Date().getTime()
      //await fetch
      fetch(url)
        .then(response => response.json())
        .then((data) => {
          if (lastGempaId.current != data.identifier) {
            lastGempaId.current = data.identifier;
            const coordinates = data.info.point.coordinates.split(",");
            if (parseFloat(data.info.magnitude) > 5) {
              warningHandler({
                id: data.identifier,
                lng: parseFloat(coordinates[0]),
                lat: parseFloat(coordinates[1]),
                mag: parseFloat(data.info.magnitude),
                depth: data.info.depth,
                message: data.info.description + "\n" + data.info.instruction
              });
            } else {
              var notif = new Audio(smallEarthQuakeSound);
              notif.play();
              map.current!.flyTo({
                center: [parseFloat(coordinates[0]), parseFloat(coordinates[1])],
                zoom: 7,
                essential: true
              });

              const tg = new TitikGempa(data.identifier, {
                coordinates: [coordinates[0], coordinates[1]],
                pWaveSpeed: 6000,
                sWaveSpeed: 3000,
                map: map.current!,
                description: data.info.description + "\n" + data.info.instruction,
                mag: parseFloat(data.info.magnitude) || 9.0,
                depth: data.info.depth || "10 Km",
              });

              if (titikGempaKecil.current) {
                titikGempaKecil.current.removeAllRender();
              }
              titikGempaKecil.current = tg;

            }
          }
        })
        .catch((error) => {
          console.error('Error initializing socket:', error);
        });
    }, 5000);

    setInterval(() => {
      const url = "https://bmkg-content-inatews.storage.googleapis.com/lastQL.json?t=" + new Date().getTime();
      fetch(url)
        .then(response => response.json())
        .then((data) => {
          const feature = data.features[0];
          const msg = `
  ${feature.properties.place}
  Magnitudo : ${feature.properties.mag}
  Kedalaman : ${feature.properties.depth}
  Lokasi (Lat,Lng) : 
  ${feature.geometry.coordinates[0]} , ${feature.geometry.coordinates[1]}`
          const nig: InfoGempa = {
            id: feature.properties.id,
            lng: parseFloat(feature.geometry.coordinates[1]),
            lat: parseFloat(feature.geometry.coordinates[0]),
            mag: parseFloat(feature.properties.mag) || 9.0,
            depth: feature.properties.depth || "10 Km",
            message: msg,
            place: feature.properties.place,
            time: feature.properties.time
          };
          if (lastGempaKecilId.current != feature.properties.id) {
            lastGempaKecilId.current = feature.properties.id;
            var notif = new Audio(smallEarthQuakeSound);
            notif.play();
            if (!map.current) return;
            map.current.flyTo({
              center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
              zoom: 7,
              essential: true
            });



            const tg = new TitikGempa(lastGempaKecilId.current, {
              coordinates: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
              pWaveSpeed: 6000,
              sWaveSpeed: 3000,
              map: map.current!,
              description: msg,
              mag: Number(feature.properties.mag) || 9.0,
              depth: feature.properties.depth || "10 Km",
            });






            igs.current.push(nig)
            setInfoGempas(igs.current);

            if (titikGempaKecil.current) {
              titikGempaKecil.current.removeAllRender();
            }
            titikGempaKecil.current = tg;
            setInfoGempaTerakhir(nig);
          }

          
        })
        .catch((error) => {
          console.error('Error initializing socket:', error);
        });
    }, 5000);
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
          <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
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

  function testDemoGempa() {
    if (geoJsonData.current == null) {
      alert("Wait loading geojson");
      return;
    };
    const bbox = turf.bbox(geoJsonData.current);
    const randomPosition = turf.randomPosition(bbox);
    const mag = (Math.random() * (10 - 5) + 5).toFixed(1);
    const depth = (Math.random() * 20).toFixed(1) + " Km";
    const message = "Gempa Bumi Test Pada Lokasi : Lat : " + randomPosition[1] + " Lng : " + randomPosition[0] + " Magnitudo : " + mag + " Kedalaman : " + depth;
    const id = `tg-${new Date().toLocaleTimeString()}`;
    const nig: InfoGempa = {
      id: id,
      lng: randomPosition[0],
      lat: randomPosition[1],
      mag: parseFloat(mag),
      depth: depth || "10 Km",
      message: message,
      time: new Date().toLocaleString()
    };


    warningHandler({
      id: id,
      lng: randomPosition[0],
      lat: randomPosition[1],
      mag: mag,
      depth: depth,
      message: message
    });

    setTimeout(() => {
      setInfoGempaDirasakanTerakhir(nig);
    }, 6000);

  }


  return (
    <div>
      <audio id="danger" className='hidden'>
        <source src={dangerSound} type="audio/mp3" />
      </audio>

      <div ref={mapContainer} className="w-full h-screen" />

      {stackAlert && <Card title={
        <div className='overflow-hidden'>
          <div className='strip-wrapper '><div className='strip-bar loop-strip-reverse anim-duration-20'></div><div className='strip-bar loop-strip-reverse anim-duration-20'></div></div>
          <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
            <p className='p-1 bg-black font-bold text-xs text-glow'>GEMPA BUMI</p>
          </div>
        </div>
      } className='show-pop-up  fixed top-12 md:top-6 left-0 card-float right-0 md:left-6 md:w-1/4 lg:w-1/5'>
        <p className='whitespace-pre-wrap text-glow text-xs' style={{
          fontSize: "12px"
        }}>{stackAlert.message}</p>
        <div className='red-bordered p-2 overflow-y-auto custom-scrollbar mt-2' style={{
          maxHeight: "40vh",
        }}>
          <ul>
            {stackAlert.listKotaTerdampak && stackAlert.listKotaTerdampak.map((kota, i) => {
              if (kota.hit) {
                return <li key={i} className='flex flex-grow justify-between items-center mb-2 item-daerah danger slide-in-left'>
                  <ItemKotaTerdampak kota={kota} />
                </li>
              } else {
                return <li key={i} className='flex flex-grow justify-between items-center mb-2 item-daerah slide-in-left'>
                  <ItemKotaTerdampak kota={kota} />
                </li>
              }
            })}
          </ul>
        </div>
      </Card>}


      <Card title={
        <p className='font-bold text-glow-red text-sm text-center' style={{
          color: "red"
        }}>EVENT LOG</p>
      } className=' fixed right-0  md:right-6 top-1 md:top-6 card-float md:w-1/3 lg:w-1/5 show-pop-up'>
        <ul >
          {infoGempas.map((v: InfoGempa, i) => {
            let readAbleTime = v.time;
            //convert 2024-04-03 05:45:04.621973 to d/m/Y H:i:s
            if (v.time) {
              // const date = new Date(v.time);
              // readAbleTime = date.toLocaleString('id-ID');
              const dt = DateTime.fromSQL(v.time, { zone: 'UTC' });
              readAbleTime = dt.setZone("Asia/Jakarta").toLocaleString(DateTime.DATE_SHORT)+" "+dt.setZone("Asia/Jakarta").toLocaleString(DateTime.TIME_24_WITH_SECONDS);
            }



            return <li key={i}
              onClick={() => {
                selectEvent(v);

              }}
              className='flex flex-col mb-2 list-event cursor-pointer  slide-in-left' style={{
                animationDelay: `${i * 0.01}s`,
                transform: 'translateX(-110%)'
              }}>
              <span className='block mb-1' style={{
                fontSize: "11px"
              }}>{readAbleTime}</span>
              <div className=' bordered p-2 overflow-hidden' style={{
                fontSize: "12px"
              }}>
                {Number(v.mag).toFixed(2)} M - {v.place || "uknown"}
              </div>
            </li>
          })}
        </ul>

      </Card>

      {detailInfoGempa && <Card title={
        <div className='w-full flex justify-between'>
          <p className='font-bold text-glow-red text-sm'>
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
          <p className='font-bold text-glow-red '>

          </p>
        }
        className='right-6 bottom-6 fixed hidden md:block  card-float w-1/2 md:w-1/5 show-pop-up '>
        <ul >
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2' style={{
              fontSize: "12px"
            }}>
              TIME : {detailInfoGempa.time}
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2' style={{
              fontSize: "12px"
            }}>
              MAGNITUDE : {Number(detailInfoGempa.mag).toFixed(2)} M
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2' style={{
              fontSize: "12px"
            }}>
              DEPTH : {Number(detailInfoGempa.depth).toFixed(2)} KM
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2' style={{
              fontSize: "12px"
            }}>
              PLACE : {detailInfoGempa.place}
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2' style={{
              fontSize: "12px"
            }}>
              LATITUDE : {detailInfoGempa.lat}
            </div>
          </li>
          <li className='flex flex-col mb-2 list-event'>
            <div className=' bordered p-2' style={{
              fontSize: "12px"
            }}>
              LONGITUDE : {detailInfoGempa.lng}
            </div>
          </li>


        </ul>
      </Card>}

      <div className='fixed  bottom-32 md:bottom-auto md:top-2 left-0 right-0 m-auto bordered w-24 text-sm text-center bg-black cursor-pointer' onClick={() => {
        testDemoGempa();
      }}>
        Test Gempa
      </div>

      {infoGempaTerakhir && <Card title={
        <div className='w-full flex justify-center text-center'>
          <p className='font-bold text-glow-red text-sm '>
            GEMPA TERDETEKSI TERAKHIR
          </p>

        </div>
      }

        className='show-pop-up fixed bottom-20 md:bottom-6 card-float left-1 right-1 m-auto md:w-1/4 lg:w-1/5'>
        <div className='text-glow text-sm w-full ' style={{
          fontSize: "10px"
        }}>
          <table className='w-full'>
            <tbody>
              <tr>
                <td className='text-left'>PLACE</td>
                <td className='text-right'>{infoGempaTerakhir.place}</td>
              </tr>
              <tr>
                <td className='text-left'>TIME</td>
                <td className='text-right' data-time={infoGempaTerakhir.time}>{DateTime.fromSQL(infoGempaTerakhir.time, { zone: 'UTC' }).setZone("Asia/Jakarta").toLocaleString(DateTime.DATE_SHORT)} {DateTime.fromSQL(infoGempaTerakhir.time, { zone: 'UTC' }).setZone("Asia/Jakarta").toLocaleString(DateTime.TIME_24_WITH_SECONDS)}</td>
              </tr>
              <tr>
                <td className='text-left'>MAG</td>
                <td className='text-right'>{infoGempaTerakhir.mag}</td>
              </tr>
              <tr>
                <td className='text-left'>DEPTH</td>
                <td className='text-right'>{parseFloat(infoGempaTerakhir.depth.replace(" Km", "")).toFixed(2)} KM</td>
              </tr>
              <tr>
                <td className='text-left'>LAT</td>
                <td className='text-right'>{infoGempaTerakhir.lat}</td>
              </tr>
              <tr>
                <td className='text-left'>LNG</td>
                <td className='text-right'>{infoGempaTerakhir.lng}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>}

      {infoGempaDirasakanTerakhir && <Card title={
        <div className='w-full flex justify-center text-center'>
          <p className='font-bold text-glow-red text-sm '>
            GEMPA DIRASAKAN TERAKHIR
          </p>

        </div>
      }

        className='show-pop-up fixed bottom-10 left-1 right-1 md:right-0 md:left-6 card-float  md:w-1/3 lg:w-1/5'>
        <div className='flex flex-col w-full justify-center items-center text-glow text-sm ' style={{
          fontSize: "10px"
        }}>
          <div className='w-full flex   gap-2' >
            <div>
              <div id="internal" className="label bordered flex mb-2 w-full lg:w-32">
                <div className="flex flex-col items-center p-1 ">
                  <div className="text -characters">{infoGempaDirasakanTerakhir.mag}</div>
                  <div className="text">MAG</div>
                </div>
                <div className="decal -blink -striped"></div>
              </div>
              <p className='text-glow font-bold'>DEPTH : {parseFloat(infoGempaDirasakanTerakhir.depth.replace(" Km", "")).toFixed(2)} KM</p>
            </div>
            <div className="bordered p-2 w-full">
              <table className='w-full'>
                <tbody>

                  <tr>
                    <td className='text-left'>TIME</td>
                    <td className='text-right'>{infoGempaDirasakanTerakhir.time}</td>
                  </tr>
                  <tr>
                    <td className='text-left'>MAG</td>
                    <td className='text-right'>{infoGempaDirasakanTerakhir.mag}</td>
                  </tr>
                  <tr>
                    <td className='text-left'>DEPTH</td>
                    <td className='text-right'>{infoGempaDirasakanTerakhir.depth}</td>
                  </tr>
                  <tr>
                    <td className='text-left'>LAT</td>
                    <td className='text-right'>{infoGempaDirasakanTerakhir.lat}</td>
                  </tr>
                  <tr>
                    <td className='text-left'>LNG</td>
                    <td className='text-right'>{infoGempaDirasakanTerakhir.lng}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
          <div className='mt-2 bordered'>
            <p className='text-glow p-2 break-words'>{infoGempaDirasakanTerakhir.message}</p>
          </div>
        </div>
      </Card>}



      {alertGempaBumis.map((v, i) => {
        return <div className='z-50' key={i}>
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
      <div className="fixed bottom-2 md:bottom-1 right-0 md:right-72 left-0 md:left-auto">
        <a title="Link Github" href="https://github.com/bagusindrayana/ews-concept" className='flex gap-1 text-center justify-center  m-auto'>
          <div className='github-icon'></div>
          <span>Github</span>
        </a>
      </div>


      <div className='fixed m-auto top-0 bottom-0 left-0 right-0 flex flex-col justify-center items-center overlay-bg' id='loading-screen'>
        <span className="loader"></span>
      </div>
    </div>

  );
}
