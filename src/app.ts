import express, { Request, Response } from "express"
import axios from "axios"
import cors from "cors"
import moment from "moment"
import run from './aws'
import { error } from "console"
const METADATA_URL = 'http://169.254.169.254/latest/meta-data';
const TOKEN_URL = 'http://169.254.169.254/latest/api/token';

// Function to get the metadata service token
async function getToken(): Promise<string> {
  try {
    const response = await axios.put(TOKEN_URL, null, {
      headers: {
        'X-aws-ec2-metadata-token-ttl-seconds': '21600'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching metadata token:', error);
    throw error;
  }
}

// Function to get metadata using the token
async function getMetadata(path: string, token: string): Promise<string> {
  try {
    const response = await axios.get(`${METADATA_URL}/${path}`, {
      headers: {
        'X-aws-ec2-metadata-token': token
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching metadata from path ${path}:`, error);
    throw error;
  }
}

// Main function to get IP addresses
async function getIpAddresses() {
  try {
    // Fetch the token
    const token = await getToken();

    // Fetch the public and private IP addresses
    return await getMetadata('public-ipv4', token);
  } catch (error) {
    console.error('Error retrieving IP addresses:', error);
    return "";
  }
}
getIpAddresses().then((myIP) => {
  console.log(`my address is ${myIP}`)
  const rdpInfo = {
    "user": "administrator",
    "password": "mO29pXzn%B2Kf(hwoBM$vOXbpDQ3hoWw"
  }
  //L4I(wYd)lIzqTJAEmObrL2x!GP3eUvo9
  const app = express();
  //ip:available
  const agentIPs = ["34.224.109.221", "107.21.138.173"]
  app.use(cors());

  app.get("/launch", async (req: Request, res: Response) => {
    for (const ip of agentIPs) {
      try {

        const result = (await axios.get(`http://${ip}:8001/launch`, { params: { id: moment().format('YYYY-MM-DD-HH-mm-ss') } })).data;
        if (result.success) {
          const passwordHash = (await axios.get(`http://${myIP}/Myrtille/GetHash.aspx`, { params: { password: rdpInfo.password } })).data;
          res.send({ launched: true, url: encodeURI(`http://${myIP}/Myrtille/?__EVENTTARGET=&__EVENTARGUMENT=&server=${ip}&user=${rdpInfo.user}&passwordHash=${passwordHash}&connect=Connect`) });
          return;
        }
      } catch (error) { console.log(error) }
    }
    res.send({ launched: false });
  });

  app.get("/logs", async (req: Request, res: Response) => {
    if (typeof (req.query.id) != 'string') return;
    const index = req.query.id.indexOf('_');
    console.log(req.query.id.substring(index + 1));

    res.send((await axios.get(`http://${req.query.id.substring(0, index)}:8001/logs`, { params: { id: req.query.id.substring(index + 1) } })).data);
  });

  app.get("/create_instance", async (req: Request, res: Response) => {
    const cnt = req.query.cnt;
    if (typeof (cnt) == 'string')
      run(parseInt(cnt));
    res.send("ok");
  })
  app.get("/ids", async (req: Request, res: Response) => {
    try {
      // Create an array of promises for the parallel HTTP requests
      const requests = agentIPs.map(async (ip) => {
        try {
          const response = await axios.get(`http://${ip}:8001/ids`);
          return { ip, data: response.data };
        } catch (error) {
          console.error(`Error fetching data from ${ip}:`, error);
          return { ip, data: [] };
        }
      });

      // Wait for all requests to complete
      const results = await Promise.all(requests);

      // Process results
      const result = results.reduce((acc, { ip, data }) => {
        acc[ip] = data;
        return acc;
      }, {} as Record<string, any>);
      res.json(result);
    } catch (error) {
      console.error('Error in processing requests:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  app.get("/status", async (req: Request, res: Response) => {
    let running = 0;
    for (const ip of agentIPs) {
      console.log((await axios.get(`http://${ip}:8001/status`)).data)
      try {
        if ((await axios.get(`http://${ip}:8001/status`)).data.status == true) running++;
      } catch (error) { console.log(error) }
    };
    res.send({ total: agentIPs.length, running });
  });

  app.listen(8001, () => {
    console.log("server running on port 8001");
  })
})
  .catch((error) => {
    console.error('Error retrieving IP addresses:', error);
  });
