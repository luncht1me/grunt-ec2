# grunt-ec2 [![Build Status](https://travis-ci.org/bevacqua/grunt-ec2.png?branch=master)](https://travis-ci.org/bevacqua/grunt-ec2) [![Dependency Status](https://gemnasium.com/bevacqua/grunt-ec2.png)](https://gemnasium.com/bevacqua/grunt-ec2) [![help me on gittip](http://gbindex.ssokolow.com/img/gittip-43x20.png)](https://www.gittip.com/bevacqua/) [![flattr.png][6]](https://flattr.com/submit/auto?user_id=nzgb&url=https%3A%2F%2Fgithub.com%2Fbevacqua%2Fgrunt-ec2) ![ga](https://ga-beacon.appspot.com/UA-35043128-6/grunt-ec2/readme?pixel)

> Grunt tasks to create, terminate, and deploy Node applications to AWS EC2 instances, then proxy with nginx

Abstracts away [**aws-sdk**](https://github.com/aws/aws-sdk-js) allowing you to easily launch, terminate, and deploy to AWS EC2 instances.

Note: This is a _very_, _**very**_ opinionated package. You're invited to fork it and produce your own flow, and definitely encouraged to create pull requests with your awesome improvements.

Jump to the [**task reference**](https://github.com/bevacqua/grunt-ec2#complete-task-reference) to see what it can do.

# Features

This is pretty feature packed

- Launch EC2 instances and set them up with a single task. Look ma', no hands!
- Shut them down from the console. No need to look up an id or anything.
- Use individual SSH key-pairs for each different instance, for increased security
- Deploy with a single Grunt task, using `rsync` for speed
- Use `pm2` to deploy and do hot code swaps!
- Works after reboots, too
- [Introduced at Pony Foo](http://blog.ponyfoo.com/2013/09/19/deploying-node-apps-to-aws-using-grunt "Deploying Node apps to AWS using Grunt")
- Put an `nginx` proxy server in front of Node
- Get tons of Grunt tasks to manipulate your EC2 instances
- Supports turning on `ssl` and `spdy` in your `nginx` server!

# Installation

```shell
npm install --save-dev grunt-ec2
```

You'll need to set up the AWS configuration for the project. You'll also need to have a **Security Group** set up on AWS. Make sure to enable rules for inbound SSH (port 22) and HTTP (port 80) traffic.

# Setup

```js
grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ec2: 'path/to/whatever.json'
});

grunt.loadNpmTasks('grunt-ec2');
```

Then, in your `whatever.json` file:

```json
{
  "AWS_ACCESS_KEY_ID": "<redacted>",
  "AWS_SECRET_ACCESS_KEY": "<redacted>",
  "AWS_SECURITY_GROUP": "something"
}
```

You'll need to get an access key pair for AWS, as well as create a security group on AWS by hand. Creating security groups is not supported by this package yet.

The `package.json` entry is used to take the `version` number when deploying.

For the `ec2` configuration, I don't take an object directly to _encourage hiding away_ the deployment variables, granting them only to people who can actually perform deploys. You _could_ provide an object directly, but **it's strongly discouraged**.

# Configuration

If you're confident enough, you can use the tool with just those options. Here is the full set of options and their defaults.

Variable Name|Purpose
---|---
`"AWS_DEFAULT_REGION"`|Passed to the CLI directly, defaults to `"us-east-1"`
`"AWS_ELB_NAME"`|The default Elastic Load Balancer you want to use with `ec2-elb-attach` and `ec2-elb-detach`.
`"AWS_IMAGE_ID"`|Used when creating a new instance with the `ec2-create-instance` task. Defaults to the `"ami-c30360aa"` [Ubuntu AMI](http://cloud-images.ubuntu.com/releases/raring/release-20130423/ "Ubuntu 13.04 (Raring Ringtail)").
`"AWS_INSTANCE_TYPE"`|The magnitude for our instance. Defaults to `"t1.micro"`. Used when creating instances.
`"AWS_RSYNC_USER"`|The user to SSH into the instance when deploying through `rsync`.
`"AWS_SECURITY_GROUP"`|The security group used for new instances. You'll have to create this one yourself.
`"AWS_SSH_USER"`|The user used to SSH into the instance when setting it up for the first time, after creating it.
`"ELASTIC_IP"`|Assign an AWS Elastic IP to new instances, and release it when terminating them. Defaults to `true`.
`"ENV"`| Provided as a JSON object. Variables to set in the local environment before the app starts. Useful for setting up DB credentials for example.
`"NGINX_ENABLED"`|Whether to install and use `nginx`. If installed, the Node application **must** listen on port `NGINX_PROXY_PORT`. Keep in mind that since we're going to use `pm2` to spin up a cluster, a single port won't be an issue anyways.
`"NGINX_PROXY_PORT"`|This is the port where `nginx` will proxy requests to, when it won't handle them by itself. This is the same port you'll want to use to listen with your Node application.
`"NGINX_SERVER_NAME"`|The server name for your static server, for example: `bevacqua.io`.
`"NGINX_STATIC_ERRORS"`|The relative path to your error HTML views folder root. For example `bin/views/error`.
`"NGINX_STATIC_ROOT"`|The relative path to your static folder root, for example: `bin/public`. Used to serve static assets through `nginx`.
`"NGINX_USER"`|The user to configure and run `nginx` with.
`"NGINX_WORKERS"`|The amount of workers processes used by `nginx`.
`"NODE_SCRIPT"`|The path to your script. Defaults to `app.js`, as in `node app.js`. Relative to your `cwd`.
`"NPM_INSTALL_DISABLED"`|If `true`, won't `npm install --production` after deployments
`"NPM_REBUILD"`|If `true`, will `npm rebuild` after deployments
`"PAGESPEED_API_KEY"`|If provided, will run [Google PageSpeed insights](https://developers.google.com/speed/docs/insights/) on every deployment. Get [**an API Key here**](https://developers.google.com/speed/docs/insights/v1/getting_started#auth). Requires you to setup `grunt-pagespeed` locally, in your own `Gruntfile.js`.
`"PROJECT_ID"`|Just an identifier for your project, in case you're hosting multiple ones, for some stupid reason, in the same instance. Defaults to `ec2`. This is used when creating folders inside the instance.
`"RSYNC_EXCLUDE_FROM"`|Relative path to an rsync exclusion patterns file. These are used to exclude files from being uploaded to the server during `rsync` on deploys. Defaults to ignoring `.git` and `node_modules`.
`"RSYNC_EXCLUDES"`|An array of file patterns to explicitly exclude during deploys. The `%NODE_ENV%` string will be replaced by the name tag. Unset by default.
`"RSYNC_INCLUDE_FROM"`|Relative path to an rsync inclusion patterns file. These are used to include files for upload to the server during `rsync` on deploys. Unset by default.
`"RSYNC_INCLUDES"`|An array of file patterns to explicitly include during deploys. The `%NODE_ENV%` string will be replaced by the name tag. Useful for uploading environment configuration.
`"SSH_KEYS_FOLDER"`|The relative path to a folder where you want to use with tasks that create SSH key-pairs. It doesn't need to exist, `mkdir -p` will take care of that. This defaults to a folder inside this package, which is pretty lame if you want to look at the key-pairs yourself. Although you _shouldn't need to_, I've got you covered.
`"SSL_CERTIFICATE"`|Relative path to your unified SSL certificate.
`"SSL_CERTIFICATE_KEY"`|Relative path to your private certificate key.
`"SSL_ENABLED"`|Enables SSL configuration on `nginx`. Learn [how to set it up](https://konklone.com/post/switch-to-https-now-for-free) for free.
`"SSL_STRICT"`|Whether to send a `Strict-Transport-Security` header.
`"VERBOSITY_NPM"`|Determines the output verbosity for `npm` during deployments, values are limited to `loglevel` option values for `npm`. Defaults to `info`, just like `npm` does.
`"VERBOSITY_RSYNC"`|Determines the output verbosity for `rsync`. Possible values limited to `'v'`, `'vv'`, and `'vvv'`. Defaults to `''` (not verbose at all, my friend).
 `"PM2_INSTANCES_COUNT"`| Set number processes to start with pm2. default is 2 and valid values are integers or 'max' for setting the maximum processes depending on avaible CPUs

# Tasks

Although this package exposes quite a few different tasks, here are the ones you'll want to be using directly.

## Launch an EC2 instance `ec2-launch:name`

Launches an instance and sets it up.

- Creates an SSH key-pair
- Uploads the public key to AWS
- Creates an AWS EC2 instance
- Tags the instance with the friendly name you provided
- Pings the instance until it warms up a DNS and provides SSH access (typically takes a minute)
- Sets up the instance, installing Node, `npm`, and `pm2`

#### Example:

```shell
grunt ec2-launch:teddy
```

![ec2-launch.png][3]

## Shutdown an EC2 instance `ec2-shutdown:name`

Terminates an instance and deletes related objects

- Looks up the id of an instance tagged `name`
- Terminates the AWS EC2 instance
- Deletes the key-pair associated with the instance

#### Example:

```shell
grunt ec2-shutdown:teddy
```

![ec2-shutdown.png][2]

## List running EC2 instances `ec2-list-json`

Returns a JSON list of running EC2 instances. Defaults to filtering by `running` state. You can use `ec2-list-json:all` to remove the filter, or pick another `instance-state-name` to filter by.

![ec2-list.png][5]

## Describe an instance with `ec2-lookup`

Similar to `ec2-list-json`, but lets you get the properties of an instance by name, rather than state. Try it with `grunt ec2-lookup:staging`.

## Get an SSH connection command for an instance `ec2-ssh-text:name`

Gives you a command you can copy and paste to connect to an EC2 instance through SSH. Useful to get down and dirty.

```shell
grunt ec2-ssh-text:teddy
```

![ec2-ssh.png][1]

## Deploy to an EC2 instance `ec2-deploy`

Deploys to a running EC2 instance using `rsync` over SSH.

- Connects to the instance through SSH
- Uploads `cwd` to an `rsync` folder such as `/srv/rsync/example/latest`
- Only transmits changes, similar to how `git` operates
- Using `pkg.version`, creates a folder with the newest version, like `/srv/apps/example/v/0.6.5`
- Creates a link from `/srv/apps/example/v/0.6.5` to `/srv/apps/example/current`
- Either starts the application, or reloads it with zero downtime, using `pm2`
- Instance name can be accessed through `process.env.NODE_ENV`

Example:

```shell
grunt ec2-deploy:teddy
```

![ec2-deploy.png][4]

## Deploy to multiple EC2 instances `ec2-deploy-many`

Queries EC2 for instances that match the given name and deploys to each on using `ec2-deploy`.

Example:

```shell
grunt ec2-deploy-many:teddy*
```

## Reboot an instance with `ec2-reboot`

Reboots the instance by the specified name.

- Looks up instance id for instance tagged `name`.
- Reboots it

Example:

```shell
grunt ec2-reboot:teddy
```

# Complete Task Reference

Task and Target(s)|Purpose
---|---
`ec2-assign-address:id`|Allocates an IP and assigns it to your instance
`ec2-assign-existing-address:id:ip`|Assigns an IP address to an instance without allocating a new one
`ec2-create-keypair:name`|Generates an RSA key pair and uploads the public key to AWS
`ec2-create-tag:id:name`|Tags an instance with the provided name
`ec2-delete-keypair:name`|Removes the remote and the local copies of the RSA key
`ec2-delete-tag:id`|Deletes the associated name tag for an instance
`ec2-rename-tag:old:replacement`|Tags an instance using a different name
`ec2-deploy:name`|Deploys to the instance using `rsync`, reloads `pm2` and `nginx`
`ec2-deploy-many:name`|Gets instances filtered by name tag and deploys to the instance using `rsync`, reloads `pm2` and `nginx`
`ec2-elb-attach:instance-name:elb-name?`|Attaches an instance to an ELB
`ec2-elb-detach:instance-name:elb-name?`|Detaches an instance from an ELB
`ec2-launch:name`|Creates a new instance, giving it a key-pair, a name tag, and an IP. Then sets it up
`ec2-list:state`|Lists instances filtered by state. Defaults to `running` filter, use `all` to disable filter.
`ec2-list-json:state`|Lists instances filtered by state. Defaults to `running` filter, use `all` to disable filter. Prints results in JSON
`ec2-logs-nginx-access:name`|Gets `nginx` access logs
`ec2-logs-nginx-error:name`|Gets `nginx` error logs
`ec2-logs-node:name`|Gets `pm2` logs
`ec2-lookup:name`|Gets instance filtered by name tag
`ec2-lookup-json:name`|Gets instance filtered by name tag. Prints results in JSON
`ec2-nginx-configure:name`|Installs `nginx` if necessary, updates its configuration files
`ec2-nginx-reload:name`|Reloads `nginx`
`ec2-nginx-restart:name`|Restarts `nginx`
`ec2-nginx-start:name`|Starts `nginx`
`ec2-nginx-stop:name`|Stops `nginx`
`ec2-node-list:name`|Returns output for `pm2 list`
`ec2-node-monit:name`|Runs `pm2 monit`
`ec2-node-reload:name`|Reloads app using `pm2 reload all`
`ec2-node-restart:name`|Restarts app using `pm2 restart all`
`ec2-node-start:name`|Starts app using parameterized `pm2 start`
`ec2-node-stop:name`|Stops app using `pm2 stop all`
`ec2-pagespeed:ip`|Requests the Google PageSpeed API, prints insights
`ec2-pm2-update:name`|Updates `pm2` on an instance, using `npm update -g pm2`
`ec2-reboot:name`|Reboots the EC2 instance
`ec2-release-address:ip`|Releases an IP address
`ec2-run-instance:name`|Spins up an EC2 instance, gives a name tag and assigns an IP
`ec2-setup:name`|Sets up port forwarding, installs `rsync`, `node`, and `pm2`, enqueues `ec2-nginx-configure`
`ec2-shutdown:name`|Terminates an instance, deleting its associated key-pair, IP address, and name tag
`ec2-ssh:name`|Establishes an `ssh` connection to the instance, you can emit commands to your EC2 instance
`ec2-ssh-text:name`|Displays a verbose command with which you can establish an `ssh` connection to the instance
`ec2-terminate-instance:id`|Terminates an instance
`ec2-version:name`|Get the version number currently deployed to EC2
`ec2-wait:id`|Waits for an instance to report a public DNS and be accessible through `ssh`

## Feedback

Enjoy it. Submit any [issues](https://github.com/bevacqua/grunt-ec2/issues "GitHub issues for grunt-ec2") you encounter, and send any feedback you might have my way.

  [1]: http://i.imgur.com/VRDBk9a.png "SSH just became easier than ever"
  [2]: http://i.imgur.com/U0gN4ax.png "Shutting down an instance through Grunt"
  [3]: http://i.imgur.com/CSRhe2b.png "Launching an instance single-handedly using Grunt"
  [4]: http://i.imgur.com/0yH3E5k.png "Deploy from your command-line!"
  [5]: http://i.imgur.com/ecFsa4b.png "List all instances with `grunt ec2-list-json`"
  [6]: https://api.flattr.com/button/flattr-badge-large.png
