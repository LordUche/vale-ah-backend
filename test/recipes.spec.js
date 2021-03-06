import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import server from '../server';
import db from '../server/models';
import { generateToken } from '../server/utils/helpers';
import {
  recipe,
  recipeTestUser,
  validVideoList,
  videoBearingSteps,
  invalidRecipe
} from './fixtures';

chai.use(chaiHttp);

const runtimeFixture = {};

describe('Recipes', () => {
  describe('POST /api/recipes', () => {
    before(() =>
      chai
        .request(server)
        .post('/api/users')
        .send(recipeTestUser)
        .then(res => {
          const { token } = res.body.user;
          runtimeFixture.token = token;
        })
    );
    const baseUrl = '/api/recipes';
    it('should create new recipe when token is provided', done => {
      chai
        .request(server)
        .post(baseUrl)
        .set({ authorization: runtimeFixture.token })
        .send(recipe)
        .end((err, res) => {
          const { body } = res;
          expect(res).to.have.status(201);
          expect(body.recipe).to.be.an('object');
          expect(body.recipe.id).to.be.a('number');
          expect(body.recipe.title).to.equal(recipe.title);
          expect(body.recipe.ingredients).to.include(recipe.ingredients[0]);
          expect(body.recipe.cookingTime).to.equal(recipe.cookingTime);
          expect(body.recipe.slug).to.not.equal(
            `how-to-prepare-your-finest-recipe`
          );
          done(err);
        });
    });

    it('should not create recipe when token is not provided', done => {
      chai
        .request(server)
        .post(baseUrl)
        .set({ authorization: generateToken({ id: 1000 }) })
        .send(recipe)
        .end((err, res) => {
          const { body } = res;
          expect(res).to.have.status(404);
          expect(body.errors).to.contain('User does not exist');
          done(err);
        });
    });

    it('should not create recipe when title is not provided', done => {
      chai
        .request(server)
        .post(baseUrl)
        .set({ authorization: runtimeFixture.token })
        .send({ ...recipe, title: undefined })
        .end((err, res) => {
          const { body } = res;
          expect(res).to.have.status(400);
          expect(body.errors.title)
            .to.be.an('array')
            .to.contain('is required');
          done(err);
        });
    });

    it('should not create recipe when ingredient is not provided', done => {
      chai
        .request(server)
        .post(baseUrl)
        .set({ authorization: runtimeFixture.token })
        .send({ ...recipe, ingredients: undefined })
        .end((err, res) => {
          const { body } = res;
          expect(res).to.have.status(400);
          expect(body.errors.ingredients).to.be.an('array');
          done(err);
        });
    });

    it('should not create recipe when steps are not provided', done => {
      chai
        .request(server)
        .post(baseUrl)
        .set({ authorization: runtimeFixture.token })
        .send({ ...recipe, steps: undefined })
        .end((err, res) => {
          const { body } = res;
          expect(res).to.have.status(400);
          expect(body.errors).to.haveOwnProperty('steps');
          done(err);
        });
    });

    it('should not create recipe when cookingTime is not valid', done => {
      chai
        .request(server)
        .post(baseUrl)
        .set({ authorization: runtimeFixture.token })
        .send({ ...recipe, cookingTime: undefined })
        .end((err, res) => {
          const { body } = res;
          expect(res).to.have.status(400);
          expect(body.errors).to.haveOwnProperty('cookingTime');
          done(err);
        });
    });

    it('should not create recipe when preparationTime is not valid', done => {
      chai
        .request(server)
        .post(baseUrl)
        .set({ authorization: runtimeFixture.token })
        .send({ ...recipe, preparationTime: undefined })
        .end((err, res) => {
          const { body } = res;
          expect(res).to.have.status(400);
          expect(body.errors).to.haveOwnProperty('preparationTime');
          done(err);
        });
    });

    it('should not create recipe with empty ingredient list', done => {
      chai
        .request(server)
        .post(baseUrl)
        .set({ authorization: runtimeFixture.token })
        .send({ ...recipe, ingredients: [] })
        .end((err, res) => {
          const {
            body: { errors }
          } = res;

          expect(errors).to.be.an('object');
          expect(errors).to.haveOwnProperty('ingredients');
          expect(errors.ingredients)
            .to.be.an('array')
            .with.lengthOf(1);
          expect(errors.ingredients[0])
            .to.be.a('string')
            .that.eq('does not contain 1 required value(s)');

          done(err);
        });
    });

    it('should create new recipe with full-length video', done => {
      chai
        .request(server)
        .post(baseUrl)
        .set({ authorization: runtimeFixture.token })
        .send({ ...recipe, videoList: validVideoList })
        .end((err, res) => {
          const { body } = res;

          expect(body.recipe.videoList)
            .to.be.an('array')
            .that.has.lengthOf(1);
          expect(body.recipe.videoList[0]).to.eq(validVideoList[0]);
          done(err);
        });
    });

    it('should not create recipe with invalid  full-length video url list', done => {
      chai
        .request(server)
        .post(baseUrl)
        .set({ authorization: runtimeFixture.token })
        .send({ ...recipe, videoList: invalidRecipe.videoList })
        .end((err, res) => {
          const {
            body: { errors }
          } = res;

          expect(errors).to.be.an('object');
          expect(errors).to.haveOwnProperty('videoList');
          expect(errors.videoList)
            .to.be.an('array')
            .with.lengthOf(1);
          expect(errors.videoList).to.include('"0" must be a string');
          done(err);
        });
    });

    it('should create recipes with videos for steps', done => {
      chai
        .request(server)
        .post(baseUrl)
        .set({ authorization: runtimeFixture.token })
        .send({ ...recipe, steps: videoBearingSteps })
        .end((err, res) => {
          const {
            body: {
              recipe: { steps }
            }
          } = res;

          expect(steps).to.be.an('object');

          Object.values(steps).forEach(step => {
            expect(step.videos)
              .to.be.an('array')
              .with.lengthOf(1);
          });

          done();
        });
    });
  });

  describe('GET /api/recipes', () => {
    before(async () => {
      await db.Recipe.destroy({ truncate: true, cascade: true });
    });

    describe('Fetching before create', () => {
      it('Get all should return empty array and message when no recipes exist', done => {
        chai
          .request(server)
          .get('/api/recipes')
          .end((err, res) => {
            const {
              body,
              body: { recipes, message }
            } = res;
            expect(res).to.have.status(200);
            expect(body).to.be.an('object');
            expect(recipes)
              .to.be.an('array')
              .that.has.lengthOf(0);
            expect(message).to.be.a('string');
            done(err);
          });
      });
    });

    describe('Fetch created recipe', () => {
      before(done => {
        chai
          .request(server)
          .post('/api/recipes')
          .set({ authorization: runtimeFixture.token })
          .send(recipe)
          .end(err => {
            done(err);
          });
      });

      it('should return array of recipes when recipes exist', done => {
        chai
          .request(server)
          .get('/api/recipes')
          .end((err, res) => {
            const {
              body,
              body: { recipes }
            } = res;

            expect(res).to.have.status(200);
            expect(body).to.be.an('object');
            expect(recipes)
              .to.be.an('array')
              .that.has.length.greaterThan(0);
            done(err);
          });
      });
    });
  });

  describe('GET api/recipes/:slug', () => {
    before(async () => {
      await db.Recipe.destroy({ truncate: true, cascade: true });
    });

    describe('Fetching before create', () => {
      it('getting non-existent record by slug should return error', done => {
        chai
          .request(server)
          .get('/api/recipes/random-nonexistent-slug')
          .end((err, res) => {
            expect(res).to.have.status(404);
            done(err);
          });
      });
    });

    describe('Fetch created recipe by slug', () => {
      before(done => {
        chai
          .request(server)
          .post('/api/recipes')
          .set({ authorization: runtimeFixture.token })
          .send(recipe)
          .end((err, res) => {
            const {
              body: {
                recipe: { slug }
              }
            } = res;
            runtimeFixture.slug = slug;
            done(err);
          });
      });

      it('Should get recipe by slug', done => {
        chai
          .request(server)
          .get(`/api/recipes/${runtimeFixture.slug}`)
          .end((err, res) => {
            const { body } = res;
            expect(res).to.have.status(200);
            expect(body).to.be.an('object');
            expect(body.recipe).to.be.an('object');
            done(err);
          });
      });
    });
  });

  describe('PUT api/recipes/:slug', () => {
    it('should update recipe', done => {
      chai
        .request(server)
        .put(`/api/recipes/${runtimeFixture.slug}`)
        .set({ authorization: runtimeFixture.token })
        .send({ title: 'amazing recipe new name', preparationTime: 5000 })
        .end((err, res) => {
          const {
            body,
            body: {
              recipe: { slug }
            }
          } = res;

          expect(res).to.have.status(200);
          expect(body.recipe).to.be.an('object');
          expect(body.recipe.id).to.be.a('number');
          expect(body.recipe.preparationTime).to.equal(5000);
          expect(slug).to.not.equal(runtimeFixture.slug);
          runtimeFixture.updatedSlug = slug;
          done(err);
        });
    });

    it('should return an error if recipe does not exist', done => {
      chai
        .request(server)
        .put(`/api/recipes/not-a-recipe`)
        .set({ authorization: runtimeFixture.token })
        .end((err, res) => {
          expect(res).to.have.status(404);
          done(err);
        });
    });

    it('should return an error if user does not exist', done => {
      chai
        .request(server)
        .put(`/api/recipes/${runtimeFixture.updatedSlug}`)
        .set({ authorization: generateToken({ id: 1000 }) })
        .send({ preparationTime: 5000 })
        .end((err, res) => {
          expect(res).to.have.status(404);
          done(err);
        });
    });

    it('should return an error if field value invalid', done => {
      chai
        .request(server)
        .put(`/api/recipes/${runtimeFixture.updatedSlug}`)
        .set({ authorization: runtimeFixture.token })
        .send(invalidRecipe)
        .end((err, res) => {
          const {
            body: { errors }
          } = res;

          expect(res).to.have.status(400);
          expect(errors).to.haveOwnProperty('title');
          expect(errors).to.haveOwnProperty('ingredients');
          expect(errors).to.haveOwnProperty('cookingTime');
          expect(errors).to.haveOwnProperty('preparationTime');
          expect(errors).to.haveOwnProperty('videoList');

          done(err);
        });
    });
  });

  describe('DELETE /recipes/:slug', () => {
    it('should return an error if user does not exist', done => {
      chai
        .request(server)
        .delete(`/api/recipes/${runtimeFixture.updatedSlug}`)
        .set({ authorization: generateToken({ id: 1000 }) })
        .end((err, res) => {
          expect(res).to.have.status(404);
          done(err);
        });
    });

    it('should delete recipe', done => {
      chai
        .request(server)
        .delete(`/api/recipes/${runtimeFixture.updatedSlug}`)
        .set({ authorization: runtimeFixture.token })
        .end((err, res) => {
          expect(res).to.have.status(200);
          done(err);
        });
    });
    it('should return an error if recipe does not exist', done => {
      chai
        .request(server)
        .delete(`/api/recipes/not-a-recipe`)
        .set({ authorization: runtimeFixture.token })
        .end((err, res) => {
          expect(res).to.have.status(404);
          done(err);
        });
    });
  });

  describe('Pagination', () => {
    const url = '/api/recipes';
    let items;
    before(async () => {
      const array = Array(50)
        .fill()
        .map(() =>
          chai
            .request(server)
            .post('/api/recipes')
            .set({ authorization: runtimeFixture.token })
            .send(recipe)
        );
      await Promise.all(array);

      const {
        body: { recipes }
      } = await chai
        .request(server)
        .get('/api/recipes')
        .set({ authorization: runtimeFixture.token });

      items = recipes;
    });

    it('should get all recipes when no offset or limit is set', done => {
      chai
        .request(server)
        .get(url)
        .end((err, res) => {
          const { recipes } = res.body;
          expect(res).to.have.status(200);
          expect(recipes)
            .to.be.an('Array')
            .and.to.have.lengthOf.at.least(50);
          done(err);
        });
    });

    it('should get the first 30 recipes when limit is 30 but offset is not set', done => {
      chai
        .request(server)
        .get(`${url}?limit=30`)
        .end((err, res) => {
          const { recipes } = res.body;
          expect(res).to.have.status(200);
          expect(recipes)
            .to.be.an('Array')
            .and.has.lengthOf(30);
          expect(res.body.recipes[0]).to.deep.equal(items[0]);
          done(err);
        });
    });

    it('should get 20 recipes when offset is 0 limit is not set', done => {
      chai
        .request(server)
        .get(`${url}?offset=0`)
        .end((err, res) => {
          const { recipes } = res.body;
          expect(res).to.have.status(200);
          expect(recipes).to.be.an('Array');
          expect(recipes).to.have.lengthOf(20);
          expect(res.body.recipes[0]).to.deep.equal(items[0]);
          done(err);
        });
    });

    it('should get 20 recipes when offset is 10 limit is not set', done => {
      chai
        .request(server)
        .get(`${url}?offset=10`)
        .end((err, res) => {
          const { recipes } = res.body;
          expect(res).to.have.status(200);
          expect(recipes).to.be.an('Array');
          expect(recipes).to.have.lengthOf(20);
          expect(res.body.recipes[0]).to.not.deep.equal(items[0]);
          expect(res.body.recipes[0]).to.deep.equal(items[10]);
          done(err);
        });
    });

    it('should get 25 recipes when offset is 20 and limit is 25', done => {
      chai
        .request(server)
        .get(`${url}?offset=20&limit=25`)
        .end((err, res) => {
          const { recipes } = res.body;
          expect(res).to.have.status(200);
          expect(recipes).to.be.an('Array');
          expect(recipes.length).to.equal(25);
          expect(res.body.recipes[0]).to.not.deep.equal(items[0]);
          expect(res.body.recipes[0]).to.deep.equal(items[20]);
          done(err);
        });
    });

    it('should not get recipes if offset or limit is a negative number', done => {
      chai
        .request(server)
        .get(`${url}?offset=-1&limit=-1`)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.errors).to.haveOwnProperty('offset');
          expect(res.body.errors).to.haveOwnProperty('limit');
          done(err);
        });
    });

    it('should not get recipes if limit is zero', done => {
      chai
        .request(server)
        .get(`${url}?offset=0&limit=0`)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.errors).to.haveOwnProperty('limit');
          done(err);
        });
    });

    it('should not get recipes if offset or limit is not an integer', done => {
      chai
        .request(server)
        .get(`${url}?offset=text&limit=text`)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.errors).to.haveOwnProperty('offset');
          expect(res.body.errors).to.haveOwnProperty('limit');
          done(err);
        });
    });
  });
});
