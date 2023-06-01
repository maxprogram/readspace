import os
import requests
import datetime

from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.schema import Document

from dotenv import load_dotenv
load_dotenv()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
READWISE_TOKEN = os.getenv('READWISE_TOKEN')


g_db = None
g_index = 'data/readwise_faiss_index'
g_last_fetch = 'data/last_fetch.json'


def _save_last_fetch():
	"""
		Saves the last time the database was updated
		to a local file
	"""
	time = datetime.datetime.now().isoformat()
	with open(g_last_fetch, 'w') as f:
		f.write(time)


def _get_last_fetch():
	"""
		Gets the last time the database was updated
	"""
	if not os.path.exists(g_last_fetch):
		return None
	with open(g_last_fetch, 'r') as f:
		time = f.read()
	return time


def get_highlights():
	# Needed to surpress HTTPS warning:
	import urllib3
	urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

	def fetch_from_export_api(updated_after=None):
		full_data = []
		next_page_cursor = None
		while True:
			params = {}
			if next_page_cursor:
				params['pageCursor'] = next_page_cursor
			if updated_after:
				params['updatedAfter'] = updated_after

			response = requests.get(
				url="https://readwise.io/api/v2/export/",
				params=params,
				headers={"Authorization": f"Token {READWISE_TOKEN}"},
				verify=False
			)
			full_data.extend(response.json()['results'])
			next_page_cursor = response.json().get('nextPageCursor')
			if not next_page_cursor:
				break
		return full_data

	# Get all of a user's books/highlights since last fetch time
	last_fetch = _get_last_fetch()
	all_data = fetch_from_export_api(last_fetch)

	return all_data


def build_db():
	"""
		Builds a database of Readwise highlights
	"""
	global g_db

	documents = get_highlights()

	# Create index documents
	docs = []
	for book in documents:
		author = str(book['author'] or 'Unknown')
		title = book['title']
		byline = ''
		if author != 'Unknown' and author != 'Random':
			byline = ' — ' + author + (' (' + title + ')') if title else ''

		for highlight in book['highlights']:
			if highlight.get('is_discard'):
				continue
			docs.append(Document(
				page_content=highlight['text'] + byline,
				metadata={
					'id': highlight['id'],
					'text': highlight['text'],
					'book': title,
					'author': author,
					'book_id': book['user_book_id'],
					'favorite': highlight['is_favorite'],
					'highlighted_at': highlight['highlighted_at'],
					'tags': highlight['tags'],
					'readwise_url': highlight['readwise_url'],
					'note': highlight['note'],
				}
			))

	if len(docs) == 0:
		print('No new documents to add!')
		return {"documents_added": 0}

	print('Adding ' + str(len(docs)) + ' documents to index...')

	embeddings = OpenAIEmbeddings()

	# If database already exists, add to it
	if os.path.exists(g_index):
		g_db = FAISS.load_local(g_index, embeddings)
		g_db.add_documents(docs)
	else:
		g_db = FAISS.from_documents(docs, embeddings)

	g_db.save_local(g_index)
	_save_last_fetch()

	return {"documents_added": len(docs)}


def load_db():
	"""
		Loads a database of documents from Notion
	"""
	global g_db
	if g_db is not None:
		return g_db
	
	# If database doesn't exist, throw error
	if not os.path.exists(g_index):
		raise Exception('Readwise highlights must be loaded first!')
	
	# Load database
	embeddings = OpenAIEmbeddings()
	g_db = FAISS.load_local(g_index, embeddings)
	return g_db


def search_similar(query):
	"""
		Search for similar documents to a query
	"""
	db = load_db()

	matches = db.similarity_search_with_score(query, k=30)

	results = []
	for match in matches:
		results.append({
			**match[0].metadata,
			"score": match[1],
		})

	return results


if __name__ == '__main__':
	while True:
		query = input('\nQuery: ')
		matches = search_similar(query)
		print('')
		for match in matches[:5]:
			print(match['text'])
			print('Score: ' + str(match['score']))
			print('Book: ' + match['book'])
			print('Author: ' + match['author'])
			print('')

