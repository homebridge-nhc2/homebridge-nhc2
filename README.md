# homebridge-nhc2
[![Version](http://img.shields.io/npm/v/@homebridge-nhc2/homebridge-nhc2.png)](https://www.npmjs.org/package/@homebridge-nhc2/homebridge-nhc2)
[![License](https://img.shields.io/npm/l/@homebridge-nhc2/homebridge-nhc2.svg)](https://github.com/homebridge-nhc2/homebridge-nhc2/blob/master/LICENSE)
[![Downloads](https://img.shields.io/npm/dt/@homebridge-nhc2/homebridge-nhc2.svg)](https://www.npmjs.org/package/@homebridge-nhc2/homebridge-nhc2)
[![Build Status](https://travis-ci.com/homebridge-nhc2/homebridge-nhc2.svg?branch=master)](https://travis-ci.com/homebridge-nhc2/homebridge-nhc2)
[![Dependencies](https://david-dm.org/homebridge-nhc2/homebridge-nhc2.svg)](https://david-dm.org/homebridge-nhc2/homebridge-nhc2)
[![Gitter chat](https://badges.gitter.im/homebridge-nhc2/community.png)](https://gitter.im/homebridge-nhc2/community)

As of October 29, 2019 Niko has published their [Hobby API](https://www.niko.eu/en/campaign/niko-home-control/hobby-api) which allows end users to control their Niko Home Control 2 installation through the MQTT protocol.
This homebridge plugin adds homekit support for a Niko Home Control 2 having the Hobby API defined as a connected service.

Supported actions include:
* toggle light status
* set light brightness level

## Changes

You can read the complete history of changes in the 
[CHANGELOG](https://github.com/homebridge-nhc2/homebridge-nhc2/blob/master/CHANGELOG.md).

## Known Issues

1. Currently we need to set the `rejectUnauthorized` option to false because we are unable to verify the Niko root CA which is not ideal. Feel free to look into this.

## Project Principles

This project has a few principles that have and will continue to guide its 
development.

1. **Dependency lean**. Try to keep the required dependencies to a minimum.
2. **Simple**. Using the plugin should be simple and straightforward 
following common conventions.
3. **Completeness** This plugin is a far way from being complete, but we aim to make this plugin feature complete based on the official Niko documentation.

## Contributing

Contributions are welcome, particularly bug fixes and enhancements!
Refer to our [Contribution Guidelines](https://github.com/homebridge-nhc2/homebridge-nhc2/blob/master/CONTRIBUTING.md) for details.

> Please note that Project owners reserve the right to accept or reject any PR
> for any reason.

## Code of Conduct

Before contributing or participating in the homebridge-nhc2 community please be sure to 
familiarize yourself with our project 
[CODE OF CONDUCT](https://github.com/homebridge-nhc2/homebridge-nhc2/blob/master/CODE_OF_CONDUCT.md). 
These guidelines are intended to govern interactions with and within the homebridge-nhc2 
community.

# Hobby API Documentation

The Hobby API encapusulated by this plugin is documented by Niko which can be found [here](https://mynikohomecontrol.niko.eu/Content/hobbyapi/documentation.pdf)
	
# Warranty Disclaimer

You may use this plugin with the understanding that doing so is 
**AT YOUR OWN RISK**. No warranty, express or implied, is made with regards 
to the fitness or safety of this code for any purpose. If you use this 
plugin to query or change settings of your installation you understand that it 
is possible to break your installation and may require the replace of devices or 
intervention of professionals of which costs cannot be returned by the project team.

# Installation

In order to use the plugin you must first download and install it globally.

    npm install -g @homebridge-nhc2/homebridge-nhc2

You may also install directly from the GitHub 
[source](https://github.com/homebridge-nhc2/homebridge-nhc2). Either download and unzip 
the source, or clone the repository. Run the build command and pass the **-P** flag to homebridge to be able to locate the plugin.

## Connecting the Hobby API

Login in to [mynikohomecontrol](https://mynikohomecontrol.niko.eu/) and add the `Hobby API` to your connected services. This will provide you with a password which in formatted as a JWT token and valid for 1 year.

Following options are available for configuring the plugin.
* host 
* port (default to 8884)
* clientId (default to NHC2-homebridge)
* username (default to hobby)
* password

	  
Add the plugin to the **platforms** section in your homebridge configuration file.
```json
  "platforms": [
    {
      "platform" : "NHC2",
      "name" : "NHC2",
      "host": "<IP_ADDRESS_OF_YOUR_CONNECTED_CONTROLLER>",
      "password": "<PASSWORD_PROVIDED_BY_MYNIKOHOMECONTROLL>"
    }
  ]
```

> Note: The clientId should be unique to the MQTT service provided by the Connected Controller. 
> If multiple connections with the same ClientId are running these will continuously 
> disconnect/reconnect and may skip MQTT messages.

### More Configuration Options

#### Verbose Logging

Another configuration option is de `verbose` switch. It cranks up the information that is published to the logs. This is still at an informational level and can help in detecting anomalies. To really see debugging level details, run homebridge with the `-D` switch.

#### Suppressing Accessories

Besides the required `host` & `password` and other connection-related configuraion options, the configuration also allows for suppressing accessories:

```json
  "platforms": [
    {
      "platform" : "NHC2",
      "name" : "NHC2",
      "host": "<IP_ADDRESS_OF_YOUR_CONNECTED_CONTROLLER>",
      "password": "<PASSWORD_PROVIDED_BY_MYNIKOHOMECONTROLL>",
      "suppressedAccessories": [
          "fa33d687-9225-4f9e-b55e-013abb69b42e"
      ]
    }
  ]
```

This allows for not exposing certain accessories to Homebrigde (and therefore also the Home app). This feature can be useful when sharing access to the Home app with others. 

## Plugin Development

When working on this plugin, you'll want Homebridge to load it from your development directory instead of publishing it to `npm` each time.

Run this command inside your plugin project folder so your global install of Homebridge can discover it:


```shell
npm link
```

*You can undo this using the `npm unlink` command.*

Then start Homebridge in debug mode:

```shell
homebridge -D
```

This will start up Homebridge and load your in-development plugin. Note that you can also direct Homebridge to load your configuration from somewhere besides the default `~/.homebridge`, for example:

```shell
homebridge -D -U ./homebridge-dev
```

This is very useful when you are already using your development machine to host a "real" Homebridge instance (with all your accessories) that you don't want to disturb.

# Releasing a new version
To release a new version it is sufficient to bump the version number, and make sure to push the tagged commit.
Travis CI will recognize the tagged commit and publish the package to npmjs.
```bash
    npm version 2.0.0
```

Please make sure your released version is supported by [HOOBS](https://hoobs.org/), you can run HOOBS as a docker container for testing purposes.

```docker run -p 8080:80 hoobs/hoobs```
