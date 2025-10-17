import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, Check } from 'lucide-react';
import { pdfAPI } from '../api';
import toast from 'react-hot-toast';

const DEPARTMENTS = [
  'CSE', 'CSBS', 'AIML', 'CSDS', 'IT', 'CSCS', 'ECE', 'EIE', 'IOT', 'ECS', 'EE', 'CE', 'FT', 'ME', 'BCA', 'BBA', 'BHM', 'BMS'
];

const YEARS = [1, 2, 3, 4];

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    year: '',
    subject: '',
    tags: '',
  });
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setFile(file);
      } else {
        toast.error('Please select a PDF file');
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setFile(file);
      } else {
        toast.error('Please select a PDF file');
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }

    setUploading(true);
    
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('pdf', file);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('department', formData.department);
      uploadFormData.append('year', formData.year);
      uploadFormData.append('subject', formData.subject);
      
      // Convert tags string to array
      if (formData.tags) {
        const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        tagsArray.forEach(tag => uploadFormData.append('tags', tag));
      }

      await pdfAPI.upload(uploadFormData);
      
      toast.success('PDF uploaded successfully!');
      
      // Reset form
      setFile(null);
      setFormData({
        title: '',
        description: '',
        department: '',
        year: '',
        subject: '',
        tags: '',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      const message = error.response?.data?.error || 'Failed to upload PDF';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Upload PDF</h1>
        <p className="mt-2 text-gray-300">
          Upload a new PDF document to the repository
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* File Upload Area */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <h2 className="text-lg font-medium text-white mb-4">PDF File</h2>
          
          {!file ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary-400 bg-primary-900 bg-opacity-20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-primary-400 font-medium">Choose a file</span>
                  <span className="text-gray-400"> or drag and drop</span>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".pdf"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
              <p className="text-sm text-gray-400 mt-2">PDF files only, up to 50MB</p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-green-900 bg-opacity-20 border border-green-700 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-200">{file.name}</p>
                  <p className="text-sm text-green-300">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="text-green-400 hover:text-green-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* PDF Information */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <h2 className="text-lg font-medium text-white mb-4">PDF Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter PDF title"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-1">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                required
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter subject name"
                value={formData.subject}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-300 mb-1">
                Department *
              </label>
              <select
                id="department"
                name="department"
                required
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={formData.department}
                onChange={handleInputChange}
              >
                <option value="" className="bg-gray-700 text-white">Select Department</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept} className="bg-gray-700 text-white">{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-300 mb-1">
                Year *
              </label>
              <select
                id="year"
                name="year"
                required
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={formData.year}
                onChange={handleInputChange}
              >
                <option value="" className="bg-gray-700 text-white">Select Year</option>
                {YEARS.map(year => (
                  <option key={year} value={year} className="bg-gray-700 text-white">Year {year}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter a brief description of the PDF content"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter tags separated by commas (e.g. notes, lecture, assignment)"
                value={formData.tags}
                onChange={handleInputChange}
              />
              <p className="mt-1 text-sm text-gray-400">
                Separate multiple tags with commas
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={uploading || !file}
            className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
