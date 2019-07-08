## Prerequisites

1. Sign up for an [IBM Cloud account](https://cloud.ibm.com/registration/).
1. Download the [IBM Cloud CLI](https://cloud.ibm.com/docs/cli/index.html#overview).
1. Create an instance of the Speech to Text service and get your credentials:
    - Go to the [Speech to Text](https://cloud.ibm.com/catalog/services/speech-to-text) page in the IBM Cloud Catalog.
    - Log in to your IBM Cloud account.
    - Click **Create**.
    - Click **Show** to view the service credentials.
    - Copy the `apikey` value, or copy the `username` and `password` values if your service instance doesn't provide an `apikey`.
    - Copy the `url` value.

## Configuring the application

1. In the application folder, copy the *.env.example* file and create a file called *.env*

    ```
    cp .env.example .env
    ```

2. Open the *.env* file and add the service credentials that you obtained in the previous step. We are using three different APIs. 

    1. SPEECH TO TEXT 
    2. ASSISTANT
    3. TEXT TO SPEECH

    Example *.env* file that configures the `apikey` and `url` for a Speech to Text service instance hosted in the US East region:

    ```
    SPEECH_TO_TEXT_IAM_APIKEY=RCKXZfyR8c3z4GEOS7EKMeBIOv.........
    SPEECH_TO_TEXT_URL=https://stream.watsonplatform.net/speech-to-text/api

    TEXT_TO_SPEECH_USERNAME=apikey
    TEXT_TO_SPEECH_PASSWORD=kH9OlOwC2QrdRvyTfLNja0P............
    TEXT_TO_SPEECH_URL=https://gateway-wdc.watsonplatform.net/text-to-speech/api

    ASSISTANT_USERNAME=apikey
    ASSISTANT_PASSWORD=zVZFZrAPre_wQ3AV2S7..................
    ASSISTANT_URL=https://gateway.watsonplatform.net/assistant/api
    ASSISTANT_ID=0d1f465c-a8ff-4ad5-..........
    ```

## Running locally

1. Install the dependencies

    ```
    npm install
    ```

1. Run the application

    ```
    npm start
    ```

1. View the application in a browser at `localhost:3000`

## License

  This sample code is licensed under Apache 2.0.

## Contributing

  See [CONTRIBUTING](./CONTRIBUTING.md).

## Open Source @ IBM
  Find more open source projects on the [IBM Github Page](http://ibm.github.io/)


[service_url]: https://www.ibm.com/watson/services/speech-to-text/
[docs]: https://cloud.ibm.com/apidocs/speech-to-text
[sign_up]: https://cloud.ibm.com/registration/?target=/catalog/services/speech-to-text/
[demo_url]: https://speech-to-text-demo.ng.bluemix.net
