/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Purpose: RSocket setup request and response types.
import {BrokerClientId, BrokerRoutingType} from "./rsocket/metadata";
import {Buffer} from "buffer";
import {Tags} from "./rsocket/metadata/tags";

export interface SetupRequest {
    token: string;
    payload: Buffer;
    brokerClientId: BrokerClientId;
    route: string;
    brokerTargetName: string;
    addressTags: Tags;
    addressMetadataTags: Tags;
    flags: BrokerRoutingType;
}

