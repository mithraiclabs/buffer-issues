import { 
  Connection, 
  PublicKey, 
} from '@solana/web3.js';
import { SerumMarket } from '../src/utils/serum';

const connection = new Connection('https://devnet.solana.com');

(async () => {
  const dexProgramKey = new PublicKey('DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY');
  const marketKey = new PublicKey('CDhPvJY41fchNH4G4dB4VrF6G8EcTZnSBDDKWP8NLgvQ');
  const market = new SerumMarket(connection, marketKey, dexProgramKey);
  await market.initMarket();

  const bidOrderbook = await market.market.loadBids(connection);
  const askOrderbook = await market.market.loadAsks(connection);
  console.log('*** OrderBooks', bidOrderbook.getL2(1), askOrderbook.getL2(1));

})();

