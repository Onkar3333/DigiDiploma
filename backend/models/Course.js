import MongoCourse from './MongoCourse.js';
import FirebaseCourse from './FirebaseCourse.js';
import { isMongoReady } from '../lib/mongodb.js';

// Export MongoCourse if MongoDB is ready, otherwise FirebaseCourse
const Course = isMongoReady ? MongoCourse : FirebaseCourse;

export default Course;

