// lib/getGoogleServiceAccountKey.js

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { fromIni } from "@aws-sdk/credential-provider-ini";

export async function getGoogleServiceAccountKey() {
  const secretName = "google_service_key.json";
  const client = new SecretsManagerClient({ 
    region: "us-east-2",
    credentials: fromIni({ profile: 'default' }) 
    // credentials: {
    //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    // }
  });
  // console.log("client:", client);
  
  try {
    console.log("Fetching secret from AWS Secrets Manager...");
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: "AWSCURRENT"
      })
    );
    console.log("response:", response);
    const secretString = response.SecretString;
    console.log("Secret String:", secretString);
    return secretString;
  } catch (error) {
    console.error("Error retrieving secret:", error);
    throw error;
  }
}
