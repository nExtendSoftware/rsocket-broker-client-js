# rsocket-broker-client-js

RSocket Broker Client for JavaScript, 
to be used in conjunction with  [rsocket-broker](https://github.com/rsocket-broker/rsocket-broker)

## Installation 

    npm install rsocket-broker-client-js

    required running broker instance and target service

    todo: add docker-compose file for running broker and target service

## Features

- [x] Request/Response
- [x] Request/Stream
- [x] Fire/And/Forget
- [ ] Metadata
- [ ] Request/Channel
- [ ] Responders

## Usage

    /* instance of RSocket-broker-client 
        (maybe define or wrap into service) */
    const rsocket-broker-client = new RSocketBrokerClient();

    /* create a new broker client id */
    const id = new BrokerClientId();

    /* create client connection properties */
    const connectionProperties: ConnectionProperties = {
      token: 'AValidJWTToken',
      brokerUrl: 'ws://localhost:7171',
      brokerClientId: id,
      brokerClientName: 'angularBrokerClient',
      connectionTags: new Tags(),
    };

    const rsocket = await this.rsocket-broker-client.connect(connectionProperties);

    /*  
        data to send to target destination function, 
        dummyData in this sample assumes same type is returned, 
        but obviously would depend on function call. 
        This is just to show how to send data to target function
    */

    const dummyData = new DummyData();
    dummyData.value = 'test';

    /* 
        address tags are used to route to target function, 
        in this sample we are using the same tags as the target function
        Available RoutingTypes UNICAST, MULTICAST, SHARD
        The latter is untested.
    */
    const requestProperties: RequestProperties = {
      payload:  Buffer.from(dummyData.toPayloadString()),
      brokerClientId: id,
      route: 'targetFunctionName',
      brokerTargetName: 'targetServiceName',
      addressTags: addressTags,
      addressMetadataTags: new Tags(),
      flags: BrokerRoutingType.UNICAST,
    };  
    
    /* 
        send request/responsestream to target function
        metadata is not optional
    */
    const metadata=  this.rsocket-broker-client.addMetadata(requestProperties.token, requestProperties.brokerClientId, requestProperties.route, requestProperties.addressMetadataTags, requestProperties.addressTags, requestProperties.flags)
    const response = await this.rsocket-broker-client.requestStream(rsocket, dummyData.toPayloadString(), metadata);
    response.subscribe({
        next: (payload: string) => {
          const dummyData = new DummyData();
          dummyData.fromPayloadString(payload);
          console.log(dummyData);
        },
        error: (error: Error) => { console.log(error); },
        complete: () => { console.log('complete'); },
    });


## Building

Run `nx build rsocket-broker-client-js` to build the library.

## Running unit tests

Run `nx test rsocket-broker-client-js` to execute the unit tests via [Jest](https://jestjs.io).
