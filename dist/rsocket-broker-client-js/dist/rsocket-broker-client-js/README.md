# rsocket-broker-client-js

RSocket Broker Client for JavaScript, 
to be used in conjunction with [RSocket Broker]

## Usage

    const setupConnection: SetupConnection = {
      token: 'AValidJWTToken',
      brokerUrl: 'ws://localhost:6934',
      brokerClientId: id,
      brokerClientName: 'angularBrokerClient',
      connectionTags: new Tags(),
    };

    const rsocket = await this.rSocketService.connect(setupConnection);

    const dummyData = new DummyData();
    dummyData.value = 'test';

    const setupRequest: SetupRequest = {
      payload:  Buffer.from(dummyData.toPayloadString()),
      brokerClientId: id,
      route: 'targetFunctionName',
      brokerTargetName: 'targetServiceName',
      addressTags: addressTags,
      addressMetadataTags: new Tags(),
      flags: BrokerRoutingType.UNICAST,
    };  

    const metadata=  this.rSocketService.addMetadata(setupRequest.token, setupRequest.brokerClientId, setupRequest.route, setupRequest.addressMetadataTags, setupRequest.addressTags, setupRequest.flags)
    const response = await this.rSocketService.requestStream(rsocket, flightData.toPayloadString(), metadata);
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
