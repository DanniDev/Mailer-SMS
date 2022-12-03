import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import fs from 'fs';
import cors from 'cors';

const app = express();

// init env vars
dotenv.config();

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors());

// Initialize the sheet - doc ID is the long id in the sheets URL
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

const CREDENTIALS = JSON.parse(fs.readFileSync('service.json'));

// Initialize Auth - see https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
await doc.useServiceAccountAuth({
	// env var values are copied from service account credentials generated by google
	// see "Authentication" section in docs for more info
	client_email: CREDENTIALS.client_email,
	private_key: CREDENTIALS.private_key,
});

const PORT = process.env.PORT || 5000;

app.get('*', function (req, res) {
	return res.redirect('https://www.google.com/');
});

app.post('/saved-list', async (req, res) => {
	console.log('received request from softr');
	const { onMainListUserId, savedListId } = req.body;

	// loads document properties and worksheets
	await doc.loadInfo();

	// work sheets
	const userListSheet = doc.sheetsById[653500459];
	const savedListsSheet = doc.sheetsById[2043897244];
	const mainListSheet = doc.sheetsById[420019327];

	try {
		let rows = await mainListSheet.getRows();

		for (let i = 0; i < rows.length; i++) {
			if (onMainListUserId === rows[i]['Record ID']) {
				// Row found
				let userRow = rows[i];
				if (userRow['Match Saved List Record ID'] === '') {
					console.log('MATCH RECORD FIELD EMPTY');

					rows[i]['Match Saved List Record ID'] = savedListId;
					//Update match rec field
					await rows[i].save();
				}

				console.log('MATCH USER FIELD UPDATED SUCCESSFULLY!');

				return res.status(200).json({ success: 'success' });
			}
		}
	} catch (error) {
		console.log(error.message);
		return res.status(500).json({
			error: 'Something went wrong while saving to list',
		});
	}
});

app.listen(PORT, () =>
	console.log(
		`Server running on port ${PORT} in ${process.env.NODE_ENV} mode...`
	)
);
