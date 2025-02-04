import AWS from 'aws-sdk';

AWS.config.update({
	region: 'eu-north-1',
	credentials: new AWS.Credentials({
		accessKeyId: 'AKIATOP4GHND6GVEEDOH',
		secretAccessKey:
			'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',
	}),
});

const location = new AWS.Location();

export default location;
