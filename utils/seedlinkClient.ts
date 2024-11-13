// utils/seedlinkClient.js
import { Socket } from 'net';

const seedLinkHost: string = 'eida.orfeus-eu.org';
const seedLinkPort: number = 18000;


function convertCommand(command: string): Buffer {
  /**
   * Converts a string to a Seedlink command by appending CRNL
   */
  const CR: string = String.fromCharCode(13);
  const NL: string = String.fromCharCode(10);
  console.log(command + CR + NL);
  return Buffer.from(command + CR + NL, "ascii");
}

type DataCallback = (data: string) => void;

const startSeedLinkClient = (onDataCallback: DataCallback): void => {
  const client: Socket = new Socket();

  client.connect(seedLinkPort, seedLinkHost, () => {
    console.log('Connected to SeedLink server');
    client.write(convertCommand('END'));
    client.write(convertCommand('HELLO'));
    client.write(convertCommand('DATA'));
    client.write(convertCommand('SELECT ?????'));
    client.write(convertCommand('STATION HGN NL'));
    // client.write('SELECT GE SMRI BHZ\n');
   
    // client.write(convertCommand('END'));
  });

  client.on('data', (data: Buffer) => {
    onDataCallback(data.toString());
  });

  client.on('error', (error: Error) => {
    console.log(error);
    console.error('SeedLink client error:', error);
  });

  client.on('close', () => {
    console.log('SeedLink client closed');
  });


};

export default startSeedLinkClient;