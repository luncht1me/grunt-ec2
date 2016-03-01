'use strict';

var util = require('util');
var chalk = require('chalk');
var conf = require('./lib/conf.js');
var workflow = require('./lib/workflow.js');

module.exports = function (grunt) {

    grunt.registerTask('ec2-setup', 'Sets up port forwarding, installs `rsync`, `node`, and `pm2`, enqueues `ec2-nginx-configure`', function (name) {
        conf.init(grunt);

        if (arguments.length === 0) {
            grunt.fatal([
                'You should provide an instance name.',
                'e.g: ' + chalk.yellow('grunt ec2-setup:name')
            ].join('\n'));
        }

        // TODO rsync user, node user, nginx user?

        var done = this.async();
        var cert = conf('SRV_RSYNC_CERT');
        var latest = conf('SRV_RSYNC_LATEST');
        var versions = conf('SRV_VERSIONS');
        var steps = [[
            util.format('echo "configuring up %s instance..."', name)
        ], [ // enable forwarding
            'cp /etc/sysctl.conf /tmp/',
            'echo "net.ipv4.ip_forward = 1" >> /tmp/sysctl.conf',
            'sudo cp /tmp/sysctl.conf /etc/',
            'sudo sysctl -e -p /etc/sysctl.conf'
        ], [ // forward port 80
            forwardPort(80, 8080)
        ], workflow.if_has('SSL_ENABLED', // forward port 443
            forwardPort(443, 8433)
        ), [ // rsync
            util.format('sudo mkdir -p %s', versions),
            util.format('sudo mkdir -p %s', cert),
            util.format('sudo chown ec2-user %s', cert),
            util.format('sudo mkdir -p %s', latest),
            util.format('sudo chown ec2-user %s', latest)
        ], workflow.if_has('SSL_ENABLED', { // send certificates
            rsync: {
                name: 'cert',
                local: conf('SSL_CERTIFICATE_DIRECTORY'),
                remote: conf('SRV_RSYNC_CERT'),
                dest: conf('SRV_CERT'),
                includes: [
                    '*/',
                    conf('SSL_CERTIFICATE'),
                    conf('SSL_CERTIFICATE_KEY')
                ],
                excludes: ['*']
            }
        }), [ // node.js
            'sudo yum update -y',
            'sudo yum -y install gcc-c++ make',
            'sudo yum -y install openssl-devel',
            'sudo yum -y install gcc ruby-devel rubygems git',
            'curl --silent --location https://rpm.nodesource.com/setup_5.x | sudo -E bash -',
            'sudo yum -y install nodejs',
            // Set SWAP for Node.
            'sudo /bin/dd if=/dev/zero of=/var/swap.1 bs=1M count=1024',
            'sudo /sbin/mkswap /var/swap.1',
            'sudo /sbin/swapon /var/swap.1'
        ], [ // pm2
            'sudo npm install -g pm2 --unsafe-perm',
            'sudo npm install -g strongloop',
            'sudo npm install -g grunt-cli',
            'sudo gem install sass',
            'sudo gem install compass',
            'sudo pm2 startup amazon'
        ]];

        function forwardPort(from, to) {
            return [
                util.format('sudo iptables -A PREROUTING -t nat -i eth0 -p tcp --dport %s -j REDIRECT --to-port %s', from, to),
                util.format('sudo iptables -A INPUT -p tcp -m tcp --sport %s -j ACCEPT', from),
                util.format('sudo iptables -A OUTPUT -p tcp -m tcp --dport %s -j ACCEPT', from),
                'sudo iptables-save'
            ];
        }

        workflow(steps, { name: name }, next);

        function next () {
            grunt.log.writeln('Enqueued task for %s configuration.', chalk.cyan('nginx'));
            grunt.task.run('ec2-nginx-configure:' + name);
            done();
        }
    });
};
