import { writeFile } from 'fs';
import { SigningArchwayClient } from '@archwayhq/arch3.js';
import 'dotenv/config'

const SNAPSHOT_FOLDER = process.env.OUTPATH + process.env.COLLECTION_NAME + '/';
const JSON_EXT = '.json'
const TOKEN_CONTRACT = process.env.TOKEN_CONTRACT;

async function getClient() {
  const cwClient = await SigningArchwayClient.connectWithSigner('https://rpc.mainnet.archway.io', null);
  return cwClient;
}

async function numTokens(client = null) {
  if (!client) client = await getClient();
  try {
    let entrypoint = {
      num_tokens: {}
    };
    let query = await client.queryClient.wasm.queryContractSmart(
      TOKEN_CONTRACT,
      entrypoint
    );
    if (!query['count']) throw new Error('Error resolving num_tokens query');
    return query.count;
  } catch(e) {
    console.error(e);
    return 0;
  }
}

async function loadToken(client = null, tokenId = null) {
  if (!tokenId || typeof tokenId !== 'number') return;
  if (!client) client = await getClient();
  try {
    let entrypoint = {
      all_nft_info: {
        token_id: String(tokenId)
      }
    };
    let query = await client.queryClient.wasm.queryContractSmart(
      TOKEN_CONTRACT,
      entrypoint
    );
    return query;
  } catch(e) {
    console.error(e);
    return {};
  }
}

async function main() {
  let client = await getClient();

  const TOKENS_MINTED = await numTokens();
  console.log("Computing: " + TOKENS_MINTED + " tokens, from collection: " + process.env.COLLECTION_NAME);

  // Get snapshot
  let snapshot = {};
  let holders = 0;
  for (let i = 0; i < TOKENS_MINTED; i++) {
    let tokenId = i+1;
    console.log('token_id', tokenId);
    let tokenInfo = await loadToken(client, tokenId);
    let owner = tokenInfo.access.owner;
    if (snapshot[owner]) snapshot[owner].tokens.push(String(tokenId));
    else {
      holders += 1;
      snapshot[owner] = { tokens: [String(tokenId)]};
    }
    if (i == TOKENS_MINTED-1) {
      console.log('holders', holders);
      snapshot.holders = holders;
      let timestamp = new Date().getTime();
      let filename = SNAPSHOT_FOLDER + timestamp + JSON_EXT;
      writeFile(
        filename, 
        JSON.stringify(snapshot), 
        'utf8', 
        ((err) => { 
          if (err) console.log(err);
        })
      );
    }
  }
}

main();